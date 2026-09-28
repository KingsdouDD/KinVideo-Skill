import { registerSceneTimingInject } from "../tools/scene-timing-inject.ts";

const tools = {};
registerSceneTimingInject({ registerTool: (def) => { tools[def.name] = def; } });

// 用现有的 guangzhou 项目验证：
// - 98 句 / 98 个场景 → uniform 策略应保持 1:1
// - HTML 注入 SUBTITLE_TIMINGS + window._sceneTimings + DOM data 属性
const result = await tools["scene_timing_inject"].execute(null, {
  html_path: "/Users/king/.openclaw/workspace/skills/html-video/output/guangzhou-hk-macau-trip/index.html",
  sentence_timings_path: "/Users/king/.openclaw/workspace/skills/html-video/output/guangzhou-hk-macau-trip/sentence_timings.json",
  strategy: "uniform",
});

const parsed = JSON.parse(result.content[0].text);
console.log("✓ 注入完成");
console.log("策略:", parsed.strategy);
console.log("场景数:", parsed.scene_count);
console.log("总时长:", parsed.total_duration_s.toFixed(3) + "s");
console.log("输出:", parsed.output_html_path);
console.log("\n前 5 个场景的时间:");
parsed.scene_timings.slice(0, 5).forEach(s => {
  console.log(`  scene ${s.sceneIdx}: ${s.start.toFixed(2)}s → ${s.end.toFixed(2)}s (${s.durationSec}s) 句 [${s.sentenceIdxRange[0]}-${s.sentenceIdxRange[1]}]`);
});
console.log("\n后 3 个场景:");
parsed.scene_timings.slice(-3).forEach(s => {
  console.log(`  scene ${s.sceneIdx}: ${s.start.toFixed(2)}s → ${s.end.toFixed(2)}s (${s.durationSec}s) 句 [${s.sentenceIdxRange[0]}-${s.sentenceIdxRange[1]}]`);
});

// 验证总和
const totalScene = parsed.scene_timings.reduce((a, s) => a + s.durationSec, 0);
console.log("\n总和验证:", totalScene.toFixed(3) + "s (期望 ≈ " + parsed.total_duration_s.toFixed(3) + "s)");