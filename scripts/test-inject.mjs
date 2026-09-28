import { registerSubtitleInject } from "../tools/subtitle-inject.ts";

const tools = {};
registerSubtitleInject({ registerTool: (def) => { tools[def.name] = def; } });

const result = await tools["subtitle_inject"].execute(null, {
  html_path: "/Users/king/.openclaw/workspace/skills/html-video/output/ai-history/index_v3.html",
  silence_json_path: "/Users/king/.openclaw/workspace/skills/html-video/output/ai-history/sentence_timings.json",
  narration_path: "/Users/king/.openclaw/workspace/skills/html-video/output/ai-history/narration.txt",
});
console.log(result.content[0].text.slice(0, 2000));