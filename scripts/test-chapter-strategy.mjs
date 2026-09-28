import { registerSceneTimingInject } from "../tools/scene-timing-inject.ts";

const tools = {};
registerSceneTimingInject({ registerTool: (def) => { tools[def.name] = def; } });

// demo: 20 个场景 × 45 个带 chapter 的句子
// scenes 0-1 对 OPEN, 2-3 对 GUANGZHOU, 4-5 对 GUANGZHOU-TOWER ...
// scenes 12-15 对 MACAU 相关
// scenes 16-19 没匹配 → fallback 均匀分配吃剩下 53 句
const scenesMetadata = JSON.stringify([
  { idx: 0, chapter: "OPEN" },
  { idx: 1, chapter: "OPEN" },
  { idx: 2, chapter: "GUANGZHOU" },
  { idx: 3, chapter: "GUANGZHOU" },
  { idx: 4, chapter: "GUANGZHOU-TOWER" },
  { idx: 5, chapter: "GUANGZHOU-TOWER" },
  { idx: 6, chapter: "GUANGZHOU-NIGHT" },
  { idx: 7, chapter: "GUANGZHOU-NIGHT" },
  { idx: 8, chapter: "HK" },
  { idx: 9, chapter: "HK" },
  { idx: 10, chapter: "HK-FOOD" },
  { idx: 11, chapter: "HK-FOOD" },
  { idx: 12, chapter: "HK-MACAU" },
  { idx: 13, chapter: "MACAU" },
  { idx: 14, chapter: "MACAU" },
  { idx: 15, chapter: "MACAU" },
  { idx: 16, chapter: null }, // fallback
  { idx: 17, chapter: null },
  { idx: 18, chapter: null },
  { idx: 19, chapter: null },
]);

const result = await tools["scene_timing_inject"].execute(null, {
  html_path: "/Users/king/.openclaw/workspace/skills/html-video/scripts/demo-scene-timing.html",
  sentence_timings_path: "/Users/king/.openclaw/workspace/skills/html-video/output/guangzhou-hk-macau-trip/sentence_timings_with_chapter.json",
  scenes_metadata: scenesMetadata,
  strategy: "chapter",
});

const parsed = JSON.parse(result.content[0].text);
console.log("✓ chapter 模式注入完成");
console.log("策略:", parsed.strategy);
console.log("场景数:", parsed.scene_count);
console.log("\n每个场景时间:");
parsed.scene_timings.forEach(s => {
  const tag = s.chapter ? `[${s.chapter}]` : '[FALLBACK]';
  console.log(`  scene ${String(s.sceneIdx).padStart(2)}: ${s.start.toFixed(2)}s → ${s.end.toFixed(2)}s (${s.durationSec}s) 句 [${s.sentenceIdxRange[0]}-${s.sentenceIdxRange[1]}] ${tag}`);
});

const total = parsed.scene_timings.reduce((a, s) => a + s.durationSec, 0);
console.log("\n总和:", total.toFixed(3) + "s (期望 ≈ " + parsed.total_duration_s.toFixed(3) + "s)");