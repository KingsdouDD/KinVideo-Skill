import { registerSceneTimingInject } from "../tools/scene-timing-inject.ts";

const tools = {};
registerSceneTimingInject({ registerTool: (def) => { tools[def.name] = def; } });

const result = await tools["scene_timing_inject"].execute(null, {
  html_path: "/Users/king/.openclaw/workspace/skills/html-video/scripts/demo-manual.html",
  sentence_timings_path: "/Users/king/.openclaw/workspace/skills/html-video/output/guangzhou-hk-macau-trip/sentence_timings.json",
  strategy: "manual",
});

const parsed = JSON.parse(result.content[0].text);
console.log("策略:", parsed.strategy);
console.log("场景数:", parsed.scene_count);
parsed.scene_timings.forEach(s => {
  console.log(`  scene ${s.sceneIdx}: ${s.start.toFixed(2)}s → ${s.end.toFixed(2)}s (${s.durationSec}s) 句 [${s.sentenceIdxRange[0]}-${s.sentenceIdxRange[1]}]`);
});
const total = parsed.scene_timings.reduce((a, s) => a + s.durationSec, 0);
console.log("\n总和:", total.toFixed(3) + "s (期望 ≈ 219.311s)");