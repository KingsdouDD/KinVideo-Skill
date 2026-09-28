import { registerAudioSentenceBreakpoints } from "../tools/audio-sentence-breakpoints.ts";

const tools = {};
registerAudioSentenceBreakpoints({ registerTool: (def) => { tools[def.name] = def; } });

const result = await tools["audio_sentence_breakpoints"].execute(null, {
  audio_path: "/Users/king/.openclaw/workspace/skills/html-video/output/ai-history/audio_full.wav",
  narration_path: "/Users/king/.openclaw/workspace/skills/html-video/output/ai-history/narration.txt",
});
console.log(result.content[0].text.slice(0, 3000));