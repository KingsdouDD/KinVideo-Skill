/**
 * tts_with_silence — 智能切分音频 + 程序性插入静音
 *
 * 核心目的：解决两个问题
 *   1. TTS 不会自动在句间停顿 → 需要程序性插入静音让画面切换
 *   2. 按字数预估切音频会切到字中间 → 必须按真实静音点切才不卡壳
 *
 * 工作流：
 *   1. 按字数算出每句话的预估边界
 *   2. 用 ffmpeg silencedetect 找所有真实静音段
 *   3. 每个预估边界 → 对齐到**最近的真实静音段**（在 ±1.5s 范围内）
 *   4. 用对齐后的真实边界切音频（-ss + -to，重新编码避免帧破损）
 *   5. ffmpeg concat 拼接，每段之间插入静音
 *   6. 输出 sentence_timings.json
 *
 * 为什么这样不会卡壳？
 *   静音段天然就是"字与字之间"的安全切分点。在静音段开始处切音频，
 *   前后两端都是无声的，拼接起来听不出断裂。
 */

import { Type } from "typebox";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

interface SilencePoint {
  start: number;
  end: number;
  span: number;
}

interface SentenceTiming {
  index: number;
  start: number;
  end: number;
  text: string;
}

interface TtsWithSilenceResult {
  output_audio_path: string;
  sentence_timings_json_path: string;
  total_duration: number;
  sentence_count: number;
  silence_gap: number;
  alignment_method: "silence" | "fallback";
  sentence_timings: SentenceTiming[];
}

function parseNarration(text: string): string[] {
  const normalized = text
    .replace(/###/g, "\n\n\n\n")
    .replace(/\n{4,}/g, "\n\n\n\n");
  return normalized
    .split("\n\n\n\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function getWavDuration(file: string): number {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
    { encoding: "utf8" }
  ).trim();
  return parseFloat(out);
}

/**
 * 抽所有真实静音段
 */
function extractSilences(
  audioPath: string,
  noiseThreshold: string,
  minSilenceDuration: number
): SilencePoint[] {
  const out = execSync(
    `ffmpeg -i "${audioPath}" -af "silencedetect=noise=${noiseThreshold}:d=${minSilenceDuration}" -f null - 2>&1`,
    { encoding: "utf8", maxBuffer: 100 * 1024 * 1024 }
  );

  const starts: number[] = [];
  const ends: number[] = [];
  for (const line of out.split("\n")) {
    const sm = line.match(/silence_start:\s*([\d.]+)/);
    const em = line.match(/silence_end:\s*([\d.]+)/);
    if (sm) starts.push(parseFloat(sm[1]));
    if (em) ends.push(parseFloat(em[1]));
  }

  const result: SilencePoint[] = [];
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    result.push({ start: starts[i], end: ends[i], span: ends[i] - starts[i] });
  }
  return result;
}

/**
 * 把字数预估边界对齐到最近的真实静音点
 * @param estBoundary 字数预估的边界时刻
 * @param silences 真实静音段列表
 * @param searchRadius 搜索半径（秒）
 * @returns 对齐后的边界时刻
 */
function alignToSilence(
  estBoundary: number,
  silences: SilencePoint[],
  searchRadius: number
): number {
  // 在搜索半径内找最近的静音点
  const candidates = silences.filter(
    (s) => Math.abs(s.start - estBoundary) <= searchRadius
  );

  if (candidates.length === 0) {
    // 兜底：没有合适的静音点，保持预估边界
    return estBoundary;
  }

  // 选最近的
  candidates.sort((a, b) => Math.abs(a.start - estBoundary) - Math.abs(b.start - estBoundary));
  return candidates[0].start;
}

export function registerTtsWithSilence(api: any) {
  api.registerTool({
    name: "tts_with_silence",
    description:
      "智能切分音频 + 程序性插入静音。按字数预估边界，再对齐到最近的真实静音点（silencedetect 抓出的字词气口），避免切到字中间卡壳。",
    parameters: Type.Object({
      audio_path: Type.String({
        description: "输入 wav 路径（由 qwe3_tts 合成）",
      }),
      narration_path: Type.String({
        description: "narration.txt 路径。句间用 ### 或 4+ 换行分隔。",
      }),
      silence_gap: Type.Optional(
        Type.Number({
          description: "句间插入的静音秒数。默认 0.5s。",
          default: 0.5,
        })
      ),
      noise_threshold: Type.Optional(
        Type.String({
          description: "静音检测 dB 阈值。默认 -30dB（能抓 TTS 字词间的微停顿）。",
          default: "-30dB",
        })
      ),
      min_silence_duration: Type.Optional(
        Type.Number({
          description: "被认定为停顿的最短时长（秒）。默认 0.08s（TTS 自然收声的微停顿）。",
          default: 0.08,
        })
      ),
      search_radius: Type.Optional(
        Type.Number({
          description:
            "对齐搜索半径（秒）。在预估边界 ±search_radius 内找最近的真实静音点。默认 1.5s。",
          default: 1.5,
        })
      ),
      output_audio_path: Type.Optional(
        Type.String({
          description: "输出 wav 路径。默认 = audio_path 同目录下的 audio_with_silence.wav",
        })
      ),
    }),
    async execute(_id: any, params: any) {
      const {
        audio_path,
        narration_path,
        silence_gap = 0.5,
        noise_threshold = "-30dB",
        min_silence_duration = 0.08,
        search_radius = 1.5,
        output_audio_path,
      } = params as {
        audio_path: string;
        narration_path: string;
        silence_gap?: number;
        noise_threshold?: string;
        min_silence_duration?: number;
        search_radius?: number;
        output_audio_path?: string;
      };

      if (!existsSync(audio_path)) {
        throw new Error(`音频不存在: ${audio_path}`);
      }
      if (!existsSync(narration_path)) {
        throw new Error(`narration 不存在: ${narration_path}`);
      }

      const sentences = parseNarration(readFileSync(narration_path, "utf8"));
      if (sentences.length === 0) {
        throw new Error("narration 中没有有效句子");
      }

      const totalDur = getWavDuration(audio_path);
      const projectDir = dirname(resolve(audio_path));
      const tempDir = resolve(projectDir, ".tts_temp");
      const outputAudio = output_audio_path
        ? resolve(output_audio_path)
        : resolve(projectDir, "audio_with_silence.wav");

      execSync(`mkdir -p "${tempDir}"`);

      // Step 1: 抽所有真实静音点
      const silences = extractSilences(audio_path, noise_threshold, min_silence_duration);
      console.error(`[tts_with_silence] 抽到 ${silences.length} 个静音段（${noise_threshold} d=${min_silence_duration}s）`);

      // Step 2: 字数预估边界
      const charCounts = sentences.map((s) => s.length);
      const totalChars = charCounts.reduce((a, b) => a + b, 0);
      const segDurations = charCounts.map((c) => (c / totalChars) * totalDur);

      const estBoundaries: number[] = [];
      let cur = 0;
      for (let i = 0; i < sentences.length - 1; i++) {
        cur += segDurations[i];
        estBoundaries.push(cur);
      }

      // Step 3: 对齐到真实静音点
      const realBoundaries: number[] = [];
      let alignmentMethod: "silence" | "fallback" = "silence";
      for (let i = 0; i < estBoundaries.length; i++) {
        const aligned = alignToSilence(estBoundaries[i], silences, search_radius);
        // 保证单调递增（不能比前一个边界还小）
        const prevBoundary = realBoundaries.length > 0 ? realBoundaries[realBoundaries.length - 1] : 0;
        const final = Math.max(aligned, prevBoundary + 0.05);
        realBoundaries.push(final);
        console.error(
          `[tts_with_silence] 句${i+1}→${i+2}: 预估 ${estBoundaries[i].toFixed(2)}s → 对齐到 ${final.toFixed(2)}s (偏差 ${(final - estBoundaries[i]).toFixed(2)}s)`
        );
      }

      // Step 4: 构造每句话的真实起止时间
      const timings: SentenceTiming[] = [];
      let prevBoundary = 0;
      for (let i = 0; i < sentences.length; i++) {
        const end = i < realBoundaries.length ? realBoundaries[i] : totalDur;
        timings.push({
          index: i,
          start: +prevBoundary.toFixed(3),
          end: +end.toFixed(3),
          text: sentences[i],
        });
        prevBoundary = end;
      }

      // Step 5: 生成静音文件
      const silencePath = resolve(tempDir, "silence.wav");
      execSync(
        `ffmpeg -y -f lavfi -i "anullsrc=channel_layout=mono:sample_rate=24000" -t "${silence_gap}" -c:a pcm_s16le "${silencePath}" 2>/dev/null`,
        { stdio: "ignore" }
      );

      // Step 6: 按真实边界切 + 拼接
      const concatList: string[] = [];
      for (let i = 0; i < timings.length; i++) {
        const t = timings[i];
        const segPath = resolve(tempDir, `seg_${i.toString().padStart(3, "0")}.wav`);

        // -ss + -to（绝对边界），重新编码为 pcm_s16le
        execSync(
          `ffmpeg -y -i "${audio_path}" -ss "${t.start}" -to "${t.end}" -c:a pcm_s16le -ar 24000 "${segPath}" 2>/dev/null`,
          { stdio: "ignore" }
        );

        const segDur = getWavDuration(segPath);
        if (segDur < 0.1) {
          console.error(`[tts_with_silence] 警告：句 ${i+1} 切出来只有 ${segDur.toFixed(3)}s`);
        }

        concatList.push(`file '${segPath}'`);
        if (i < timings.length - 1) {
          concatList.push(`file '${silencePath}'`);
        }
      }

      const concatFile = resolve(tempDir, "concat.txt");
      writeFileSync(concatFile, concatList.join("\n"));
      execSync(
        `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c copy "${outputAudio}" 2>/dev/null`,
        { stdio: "ignore" }
      );

      const newTotalDur = getWavDuration(outputAudio);

      // Step 7: 输出 timings.json
      const timingsPath = resolve(projectDir, "sentence_timings.json");
      writeFileSync(
        timingsPath,
        JSON.stringify(
          {
            total_duration: newTotalDur,
            sentence_count: sentences.length,
            silence_gap,
            timings,
          },
          null,
          2
        ),
        "utf8"
      );

      try {
        execSync(`rm -rf "${tempDir}"`);
      } catch {}

      const result: TtsWithSilenceResult = {
        output_audio_path: outputAudio,
        sentence_timings_json_path: timingsPath,
        total_duration: newTotalDur,
        sentence_count: sentences.length,
        silence_gap,
        alignment_method: alignmentMethod,
        sentence_timings: timings,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  });
}