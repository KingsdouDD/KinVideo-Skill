/**
 * video_audio_mux — 视频 + 音频 → 最终 MP4
 *
 * 核心设计：
 *   - 视频通常 > 音频，用 apad=whole_dur= 补齐音频（不拉视频，会卡帧）
 *   - -c:v copy 不重编码（快 100 倍）
 *   - audio_full.wav 不存在 → 明确报错（不默认用别的音频）
 *   - 输出 final-<preset>.mp4（同项目多规格版本可共存）
 *   - ffprobe 校验最终时长差 < 0.1s
 *
 * 目标：**画面、语音、字幕完全同步**——这是你最终要的。
 */

import { Type } from "typebox";
import { execSync, spawn } from "node:child_process";
import { existsSync, statSync, unlinkSync } from "node:fs";
import { dirname, resolve, basename, extname } from "node:path";

interface MuxResult {
  final_path: string;
  video_path: string;
  audio_path: string;
  video_duration: number;
  audio_duration: number;
  final_duration: number;
  duration_diff: number;
  size_mb: number;
  sync_ok: boolean;
}

const SYNC_TOLERANCE = 0.1; // 秒

function getDuration(file: string): number {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
    { encoding: "utf8" }
  ).trim();
  return parseFloat(out);
}

export function registerVideoAudioMux(api: any) {
  api.registerTool({
    name: "video_audio_mux",
    description:
      "无音轨 MP4 + 音频 → final-<preset>.mp4。apad 音频补齐（不拉视频），-c:v copy 不重编码，自动校验时长差 < 0.1s。",
    parameters: Type.Object({
      video_path: Type.String({ description: "video_raw.mp4 绝对路径（无音轨）" }),
      audio_path: Type.String({ description: "audio_full.wav 绝对路径" }),
      preset: Type.Optional(
        Type.String({
          description: "输出文件名后缀。默认从 video_path 所在目录的 preset 取",
          default: "horizontal-16:9",
        })
      ),
      audio_bitrate: Type.Optional(
        Type.String({ description: "音频码率", default: "128k" })
      ),
    }),
    async execute(_id: any, params: any) {
      const {
        video_path,
        audio_path,
        preset = "horizontal-16:9",
        audio_bitrate = "128k",
      } = params as {
        video_path: string;
        audio_path: string;
        preset?: string;
        audio_bitrate?: string;
      };

      if (!existsSync(video_path))
        throw new Error(`视频文件不存在: ${video_path}`);
      if (!existsSync(audio_path))
        throw new Error(`音频文件不存在: ${audio_path}（不默认用别的音频，请先生成）`);

      const projectDir = dirname(video_path);
      const finalPath = resolve(projectDir, `final-${preset}.mp4`);

      const videoDur = getDuration(video_path);
      const audioDur = getDuration(audio_path);

      console.error(`🎞️  视频时长: ${videoDur.toFixed(2)}s`);
      console.error(`🎙️  音频时长: ${audioDur.toFixed(2)}s`);

      // 1. apad 音频补齐到视频长度（视频更长，所以补音频而不是裁视频）
      const paddedAudio = resolve(projectDir, ".audio_padded.wav");
      execSync(
        `ffmpeg -y -i "${audio_path}" -af "apad=whole_dur=${videoDur},atrim=0:${videoDur}" -ac 2 -ar 44100 "${paddedAudio}"`,
        { stdio: "inherit" }
      );

      // 2. -c:v copy + aac 编码音频
      execSync(
        `ffmpeg -y -i "${video_path}" -i "${paddedAudio}" -c:v copy -c:a aac -b:a ${audio_bitrate} -shortest "${finalPath}"`,
        { stdio: "inherit" }
      );

      // 清理中间文件
      try {
        unlinkSync(paddedAudio);
      } catch {
        /* ignore */
      }

      // 3. 校验时长
      const finalDur = getDuration(finalPath);
      const diff = Math.abs(finalDur - videoDur);
      const syncOk = diff < SYNC_TOLERANCE;

      if (!syncOk) {
        console.error(
          `⚠️  最终时长 ${finalDur}s 与视频时长 ${videoDur}s 差 ${diff}s，超过 ${SYNC_TOLERANCE}s 容差`
        );
      } else {
        console.error(`✅ 时长对齐 OK（差 ${diff.toFixed(3)}s）`);
      }

      const stats = statSync(finalPath);
      const result: MuxResult = {
        final_path: finalPath,
        video_path,
        audio_path,
        video_duration: +videoDur.toFixed(3),
        audio_duration: +audioDur.toFixed(3),
        final_duration: +finalDur.toFixed(3),
        duration_diff: +diff.toFixed(3),
        size_mb: +(stats.size / 1024 / 1024).toFixed(2),
        sync_ok: syncOk,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  });
}
