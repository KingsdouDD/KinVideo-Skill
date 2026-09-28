import { registerVideoRender } from "../tools/video-render.ts";

const tools = {};
registerVideoRender({ registerTool: (def) => { tools[def.name] = def; } });

// 用 1920x1080 horizontal preset
const result = await tools["video_render"].execute(null, {
  html_path: "/Users/king/.openclaw/workspace/skills/html-video/output/ai-history/index_injected.html",
  preset: "horizontal-16:9",
  overwrite: true,
});
console.log(result.content[0].text.slice(0, 2000));