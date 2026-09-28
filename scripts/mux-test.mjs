import { registerVideoAudioMux } from "../tools/video-audio-mux.ts";

const tools = {};
registerVideoAudioMux({ registerTool: (def) => { tools[def.name] = def; } });

const result = await tools["video_audio_mux"].execute(null, {
  video_path: "/Users/king/.openclaw/workspace/skills/html-video/output/ai-history/video_raw.mp4",
  audio_path: "/Users/king/.openclaw/workspace/skills/html-video/output/ai-history/audio_full.wav",
  preset: "horizontal-16:9",
});
console.log(result.content[0].text.slice(0, 2000));