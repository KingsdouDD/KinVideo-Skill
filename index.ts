/**
 * KinVideo Tools — OpenClaw 插件入口
 *
 * 注册 5 个工具（全部相对路径）：
 *   - audio_sentence_breakpoints : 音频 + 文本 → 句子级断点（不动原音频，推荐）
 *   - audio_silence_detect       : 音频 → 静音段聚类（调试用）
 *   - video_render               : HTML → video_raw.mp4（VideoToolbox，失败 fallback libx264）
 *   - subtitle_inject            : sentence_timings.json → 注入 HTML 的 SUBTITLE_TIMINGS
 *   - video_audio_mux            : 视频 + 音频 → final-<preset>.mp4
 *
 *   - tts_with_silence           : 程序性插入静音重生成音频（不推荐用于断点定位）
 */

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { registerAudioSentenceBreakpoints } from "./tools/audio-sentence-breakpoints.ts";
import { registerAudioSilenceDetect } from "./tools/audio-silence-detect.ts";
import { registerVideoRender } from "./tools/video-render.ts";
import { registerSubtitleInject } from "./tools/subtitle-inject.ts";
import { registerSceneTimingInject } from "./tools/scene-timing-inject.ts";
import { registerVideoAudioMux } from "./tools/video-audio-mux.ts";
import { registerTtsWithSilence } from "./tools/tts-with-silence.ts";
import { registerRuntimeHtmlHook } from "./tools/runtime-html-hook.ts";

export default definePluginEntry({
  id: "kinvideo-tools",
  name: "KinVideo Tools",
  description: "HTML/CSS/JS 动画生成 MP4 的工具集（音频断点、视频渲染、字幕注入、场景时间注入、混音）",
  register(api) {
    registerAudioSentenceBreakpoints(api);
    registerAudioSilenceDetect(api);
    registerVideoRender(api);
    registerSubtitleInject(api);
    registerSceneTimingInject(api);
    registerVideoAudioMux(api);
    registerTtsWithSilence(api);
    registerRuntimeHtmlHook(api);
  },
});
