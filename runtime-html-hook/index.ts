/**
 * index.ts — Runtime HTML Hook CLI 入口
 *
 * 用法：
 *   npx ts-node index.ts <sentence_timings.json> <output_dir> [--segment-count N]
 *
 * 示例：
 *   npx ts-node index.ts ./sentence_timings.json ./output/myvideo
 *   npx ts-node index.ts ./sentence_timings.json ./output/myvideo --segment-count 5
 *
 * 流程：
 *   1. 读 sentence_timings.json（Timeline）
 *   2. 生成 video-runtime.json + runtime-core.js
 *   3. 组装基础 index.html（带 Visual Slots）
 *   4. 输出给 AI Visual Designer 填充视觉
 */

import { generateVideoRuntime } from "./runtime/video-runtime-generator.js";
import { assembleRuntimeHtml } from "./runtime/assembler.js";
import { resolve, dirname } from "node:path";
import { mkdirSync } from "node:fs";

function parseArgs(): {
  timingsPath: string;
  outputDir: string;
  segmentCount?: number;
} {
  const args = process.argv.slice(2);
  const timingsPath = args[0];
  const outputDir = args[1] || "./runtime-output";
  const segmentFlag = args.indexOf("--segment-count");
  const segmentCount = segmentFlag !== -1 ? parseInt(args[segmentFlag + 1]) : undefined;

  if (!timingsPath) {
    console.error("❌ 缺少 sentence_timings.json 路径");
    console.error("用法: npx ts-node index.ts <sentence_timings.json> [output_dir] [--segment-count N]");
    process.exit(1);
  }

  return { timingsPath, outputDir, segmentCount };
}

async function main() {
  const { timingsPath, outputDir, segmentCount } = parseArgs();

  console.log("🚀 Runtime HTML Hook");
  console.log("─────────────────────────────");
  console.log("  Timeline:  ", timingsPath);
  console.log("  输出目录:   ", outputDir);
  if (segmentCount !== undefined) {
    console.log("  Segment数: ", segmentCount, "(固定，由 Runtime 控制)");
  } else {
    console.log("  Segment数: 自动 (= 句子数量)");
  }
  console.log("─────────────────────────────");

  // 确保输出目录存在
  mkdirSync(outputDir, { recursive: true });

  // Step 1: 生成 video-runtime.json + runtime-core.js
  console.log("\n📦 生成 Runtime 数据...");
  const { runtimeJsonPath, runtimeCorePath, runtime } = generateVideoRuntime(
    timingsPath,
    outputDir,
    { segmentCount }
  );
  console.log("  ✅ video-runtime.json:", runtimeJsonPath);
  console.log("  ✅ runtime-core.js:   ", runtimeCorePath);
  console.log("  📊 Segment 数量:", runtime.totalSegments);
  console.log("  ⏱  总时长:", runtime.totalDuration.toFixed(2), "秒");

  // Step 2: 组装基础 HTML
  console.log("\n🎨 组装基础 HTML...");
  const templatePath = resolve(__dirname, "./templates/index.html.template");
  const outputHtmlPath = resolve(outputDir, "index.html");

  const { slotCount } = assembleRuntimeHtml(runtimeJsonPath, outputHtmlPath, {
    templatePath,
    runtimeCorePath,
  });
  console.log("  ✅ index.html 生成完成:", outputHtmlPath);
  console.log("  🎯 Visual Slot 数量:", slotCount, "(= Segment 数量)");

  // Step 3: 输出说明
  console.log("\n─────────────────────────────");
  console.log("✅ Runtime HTML Hook 完成！");
  console.log("");
  console.log("📋 下一步交给 AI Visual Designer:");
  console.log("   1. 读取 video-runtime.json（了解时间结构）");
  console.log("   2. 读取审美设计 Skill");
  console.log("   3. 在 index.html 的每个 #slot-N 内填充视觉");
  console.log("   4. 在 visual-design.js 中实现动画逻辑");
  console.log("   5. 禁止修改 runtime-core.js 和 DOM 结构");
  console.log("");
  console.log("🔒 Runtime 硬约束:");
  console.log("   - Segment 数量: ", runtime.totalSegments, " (固定)");
  console.log("   - 时间范围:     ", runtime.segments.map(s => `${s.start.toFixed(2)}~${s.end.toFixed(2)}s`).join(", "));
  console.log("   - DOM 结构:     #stage / [data-slot-idx] / [data-active] (禁止改)");
  console.log("   - 全局接口:     window._sceneTimings / _renderFrame / _renderAt (只读)");
  console.log("");
}

main().catch((err) => {
  console.error("❌ 错误:", err.message);
  process.exit(1);
});
