/**
 * audio_sentence_breakpoints — 句子级断点定位器（不动原始音频）
 *
 * 核心目的：把"音频里每句话从哪开始到哪结束"找出来，给 HTML 渲染做时间轴。
 * 不重新生成音频、不插静音，纯分析。
 *
 * 工作流（一条龙，串好）：
 *   1. 读 narration.txt，按 ### / 3+ 空行切句
 *   2. 抽真实静音段（ffmpeg silencedetect）
 *   3. 字数预估每句边界（粗）
 *   4. 对齐到最近真实静音点（±1.5s 范围内）
 *   5. 能量谷点二次精修：在对齐点附近用 RMS 能量找气口（避免切到字中间）
 *   6. 输出 sentence_timings.json（start/end/text）
 *
 * 入参：audio_path + narration_path
 * 出参：sentence_timings.json + 控制台摘要
 *
 * 【重要】当用户想"找断点做动画分割"，用本工具；用户想"插入静音重生成音频"才用 tts_with_silence。
 *   - audio_sentence_breakpoints：不改音频，只分析 → 给 HTML 时间轴用
 *   - tts_with_silence：改音频（按字数切 + 插静音）→ 适合纯音频拼接场景
 */

import { Type } from "typebox";
import { execSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

interface SilencePoint {
  start: number;
  end: number;
  span: number;
}

interface BreakpointSentence {
  index: number;
  start: number;
  end: number;
  text: string;
}

interface BreakpointResult {
  output_json_path: string;
  total_duration: number;
  sentence_count: number;
  alignment_method: "silence+rms" | "silence" | "fallback";
  sentence_timings: BreakpointSentence[];
}

/* ---------- 工具函数 ---------- */

function parseNarration(text: string): string[] {
  const normalized = text
    .replace(/\n{4,}/g, "\n\n\n\n");
  return normalized
    .split(/\n{4,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function getWavDuration(file: string): number {
  return parseFloat(
    execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
      { encoding: "utf8" }
    ).trim()
  );
}

/** 抽真实静音段 */
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
  const r: SilencePoint[] = [];
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    r.push({ start: starts[i], end: ends[i], span: ends[i] - starts[i] });
  }
  return r;
}

/** 在某时间点附近 ±window 内用 astats 求能量，找最安静的时刻（RMS 最小） */
function refineByRms(
  audioPath: string,
  approxTime: number,
  windowSec: number
): number {
  // 截取 ±window 段，astats 输出 RMS level
  const t0 = Math.max(0, approxTime - windowSec);
  const t1 = approxTime + windowSec;
  const out = execSync(
    `ffmpeg -i "${audioPath}" -ss "${t0}" -to "${t1}" -af "astats=metadata=1:reset=1:length=0.05" -f null - 2>&1`,
    { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
  );

  // 解析 RMS level，按帧时间找最小值
  const lines = out.split("\n");
  let bestTime = approxTime;
  let bestRms = Infinity;
  let curT = t0;
  const frameDur = 0.05; // 与 astats length 一致

  for (const line of lines) {
    const ft = line.match(/frame:(\d+)/);
    if (ft) {
      // frame 索引 → 时间
      const frameIdx = parseInt(ft[1]);
      curT = t0 + frameIdx * frameDur;
      continue;
    }
    const rms = line.match(/RMS level:\s*(-?[\d.]+)/);
    if (rms && curT <= approxTime + windowSec) {
      const v = parseFloat(rms[1]);
      // RMS 越小越静，但要落在 [t0, t1] 范围内
      if (v < bestRms) {
        bestRms = v;
        bestTime = curT;
      }
    }
  }
  return +bestTime.toFixed(3);
}

/** 把预估边界对齐到最近的真实静音段起点（±radius 内） */
function alignToSilence(
  estBoundary: number,
  silences: SilencePoint[],
  radius: number
): number | null {
  const candidates = silences.filter((s) => Math.abs(s.start - estBoundary) <= radius);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => Math.abs(a.start - estBoundary) - Math.abs(b.start - estBoundary));
  return candidates[0].start;
}

/* ---------- 工具注册 ---------- */

export function registerAudioSentenceBreakpoints(api: any) {
  api.registerTool({
    name: "audio_sentence_breakpoints",
    description:
      "句子级断点定位器：根据 narration 切句，在原音频里找每句的起止时间，输出 sentence_timings.json，供 HTML 时间轴用。不动原音频、不插静音。流程：抽静音 → 字数预估 → 对齐静音点 → RMS 能量二次精修。",
    parameters: Type.Object({
      audio_path: Type.String({ description: "原音频 wav 路径" }),
      narration_path: Type.String({ description: "narration.txt 路径，句间用 ### 或 3+ 换行分隔" }),
      noise_threshold: Type.Optional(
        Type.String({ description: "静音检测 dB 阈值，默认 -30dB（能抓 TTS 字间微停顿）", default: "-30dB" })
      ),
      min_silence_duration: Type.Optional(
        Type.Number({ description: "最短静音时长（秒），默认 0.08", default: 0.08 })
      ),
      align_radius: Type.Optional(
        Type.Number({ description: "对齐搜索半径（秒），默认 1.5", default: 1.5 })
      ),
      rms_refine_window: Type.Optional(
        Type.Number({ description: "RMS 精修窗口半径（秒），默认 0.4", default: 0.4 })
      ),
      output_json_path: Type.Optional(
        Type.String({ description: "输出 JSON 路径，默认 = audio_path 同目录 sentence_timings.json" })
      ),
    }),
    async execute(_id: any, params: any) {
      const {
        audio_path,
        narration_path,
        noise_threshold = "-30dB",
        min_silence_duration = 0.08,
        align_radius = 1.5,
        rms_refine_window = 0.4,
        output_json_path,
      } = params;

      if (!existsSync(audio_path)) throw new Error(`音频不存在: ${audio_path}`);
      if (!existsSync(narration_path)) throw new Error(`narration 不存在: ${narration_path}`);

      // Step 1: 读 narration 切句
      const sentences = parseNarration(readFileSync(narration_path, "utf8"));
      if (sentences.length === 0) throw new Error("narration 中没有有效句子");

      const totalDur = getWavDuration(audio_path);
      const projectDir = dirname(resolve(audio_path));
      const outPath = output_json_path
        ? resolve(output_json_path)
        : resolve(projectDir, "sentence_timings.json");

      console.log(`[breakpoints] 音频时长 ${totalDur.toFixed(2)}s, 句子数 ${sentences.length}`);

      // Step 2: 抽真实静音段
      const silences = extractSilences(audio_path, noise_threshold, min_silence_duration);
      console.log(`[breakpoints] 抽到 ${silences.length} 个静音段 (${noise_threshold}, d=${min_silence_duration}s)`);

      // Step 3: 字数预估边界
      const totalChars = sentences.reduce((a, s) => a + s.length, 0);
      const estBoundaries: number[] = [];
      let cur = 0;
      for (let i = 0; i < sentences.length - 1; i++) {
        cur += (sentences[i].length / totalChars) * totalDur;
        estBoundaries.push(cur);
      }

      // Step 4: 对齐到静音段
      let method: "silence+rms" | "silence" | "fallback" = "silence";
      const realBoundaries: number[] = [];
      for (let i = 0; i < estBoundaries.length; i++) {
        const est = estBoundaries[i];
        let aligned = alignToSilence(est, silences, align_radius);
        if (aligned === null) {
          aligned = est;
          method = "fallback";
        }
        // 强制单调递增
        const prev = realBoundaries.length > 0 ? realBoundaries[realBoundaries.length - 1] : 0;
        aligned = Math.max(aligned, prev + 0.05);
        realBoundaries.push(aligned);
        console.log(
          `[breakpoints] 句${i + 1}→${i + 2}: 预估 ${est.toFixed(2)}s → 对齐 ${aligned.toFixed(2)}s (Δ ${(aligned - est).toFixed(2)}s)`
        );
      }

      // Step 5: RMS 二次精修（找最安静的气口）
      const refinedBoundaries: number[] = [];
      if (silences.length > 0) {
        method = "silence+rms";
        for (let i = 0; i < realBoundaries.length; i++) {
          const refined = refineByRms(audio_path, realBoundaries[i], rms_refine_window);
          const prev = refinedBoundaries.length > 0 ? refinedBoundaries[refinedBoundaries.length - 1] : 0;
          refinedBoundaries.push(Math.max(refined, prev + 0.05));
        }
      } else {
        refinedBoundaries.push(...realBoundaries);
      }

      // Step 6: 构造 timings
      const timings: BreakpointSentence[] = [];
      let prev = 0;
      for (let i = 0; i < sentences.length; i++) {
        const end = i < refinedBoundaries.length ? refinedBoundaries[i] : totalDur;
        timings.push({
          index: i,
          start: +prev.toFixed(3),
          end: +end.toFixed(3),
          text: sentences[i],
        });
        prev = end;
      }

      // 输出 JSON
      const jsonOut = {
        total_duration: +totalDur.toFixed(3),
        sentence_count: sentences.length,
        alignment_method: method,
        timings,
      };
      writeFileSync(outPath, JSON.stringify(jsonOut, null, 2), "utf8");

      const result: BreakpointResult = {
        output_json_path: outPath,
        total_duration: +totalDur.toFixed(3),
        sentence_count: sentences.length,
        alignment_method: method,
        sentence_timings: timings,
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });
}