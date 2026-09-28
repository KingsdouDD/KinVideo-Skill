/**
 * runtime-assembler.ts
 *
 * Runtime HTML Hook 的组装器
 * 职责：
 *   1. 读取 video-runtime.json
 *   2. 用 index.html.template 生成基础 HTML
 *   3. 注入 runtime-core.js 和占位 Slot
 *   4. 输出基础 HTML（交给 AI 填充视觉）
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type { VideoRuntime } from "./video-runtime-generator.js";

const SLOT_PLACEHOLDER = "<!-- KINVIDEO:SLOTS -->";
const RUNTIME_CORE_PLACEHOLDER = "<!-- KINVIDEO:RUNTIME_CORE -->";
const VISUAL_JS_PLACEHOLDER = "<!-- KINVIDEO:VISUAL_JS -->";
const AI_STYLES_PLACEHOLDER = "/* KINVIDEO:AI_STYLES */";

function readRuntimeJson(path: string): VideoRuntime {
  if (!existsSync(path)) throw new Error(`video-runtime.json 不存在: ${path}`);
  return JSON.parse(readFileSync(path, "utf8")) as VideoRuntime;
}

function readTemplate(path: string): string {
  if (!existsSync(path)) throw new Error(`模板不存在: ${path}`);
  return readFileSync(path, "utf8");
}

/**
 * 生成 Visual Slot HTML 片段
 * 每个 Segment 对应一个 #slot-N
 * AI 在这里面填视觉，Runtime 保证 slot 数量和时间正确
 */
function generateSlots(runtime: VideoRuntime): string {
  return runtime.segments
    .map(
      (seg) =>
        `  <div id="slot-${seg.segmentIdx}" ` +
        `data-slot-idx="${seg.segmentIdx}" ` +
        `data-segment-start="${seg.start.toFixed(3)}" ` +
        `data-segment-end="${seg.end.toFixed(3)}" ` +
        `data-segment-dur="${seg.durationSec.toFixed(3)}" ` +
        `data-active="false">\n` +
        `    <!-- ╔══════════════════════════════════════════════════════╗ -->\n` +
        `    <!-- ║ Segment ${seg.segmentIdx}: ${seg.start.toFixed(2)}s ~ ${seg.end.toFixed(2)}s (${seg.durationSec.toFixed(2)}s)        ║ -->\n` +
        (seg.sentences.length > 0
          ? `    <!-- ║ 语音: "${seg.sentences[0].text.substring(0, 26)}${seg.sentences[0].text.length > 26 ? "..." : ""}"  ║ -->\n`
          : ``) +
        `    <!-- ⚠️ 禁止使用黑色背景 / 深色背景 / 纯色背景，背景必须浅色系 -->\n` +
        `    <!-- AI 在这里填充视觉内容 -->`
    )
    .join("\n");
}

export interface AssembleOptions {
  templatePath?: string;   // 默认用 templates/index.html.template
  runtimeCorePath?: string; // 默认用 runtime-core.js
  visualJsPath?: string;   // 可选，AI 预先提供的 visual-design.js
}

export function assembleRuntimeHtml(
  runtimeJsonPath: string,
  outputHtmlPath: string,
  options?: AssembleOptions
): { outputPath: string; slotCount: number; segmentCount: number } {
  const runtime = readRuntimeJson(runtimeJsonPath);
  const tmplPath = options?.templatePath ||
    resolve(dirname(runtimeJsonPath), "../templates/index.html.template");
  const corePath = options?.runtimeCorePath ||
    resolve(dirname(runtimeJsonPath), "runtime-core.js");

  let html = readTemplate(tmplPath);

  // 1. 注入 Visual Slots
  if (html.includes(SLOT_PLACEHOLDER)) {
    html = html.replace(SLOT_PLACEHOLDER, generateSlots(runtime));
  }

  // 2. 注入 runtime-core.js
  if (html.includes(RUNTIME_CORE_PLACEHOLDER)) {
    const coreCode = readFileSync(corePath, "utf8");
    html = html.replace(
      RUNTIME_CORE_PLACEHOLDER,
      `<script>\n${coreCode}\n</script>`
    );
  }

  // 3. 占位 visual-design.js（AI 稍后填充）
  if (html.includes(VISUAL_JS_PLACEHOLDER)) {
    const placeholder = `<!-- AI Visual Layer: 在这里填充视觉和动画逻辑，禁止使用黑色，深色背景 -->
<!-- 推荐做法：在 visual-design.js 中覆盖 window._renderFrame -->
<script>
/*
// visual-design.js 示例结构：
window._renderFrame = function(t) {
  const state = window._renderAt(t);  // 读 Runtime 的确定性时间状态

  // 切换 Visual Slot 可见性
  window._sceneTimings.forEach((seg, idx) => {
    const el = document.getElementById('slot-' + idx);
    if (!el) return;
    const isActive = t >= seg.start && t < seg.end;
    el.setAttribute('data-active', isActive ? 'true' : 'false');
    el.style.opacity = isActive ? '1' : '0';
  });

  // TODO: AI 在这里写视觉动画
  // 例如：数字跳动、SVG 动画、stagger reveal 等
};
*/
</script>`;
    html = html.replace(VISUAL_JS_PLACEHOLDER, placeholder);
  }

  // 4. 占位 AI 样式区
  if (html.includes(AI_STYLES_PLACEHOLDER)) {
    html = html.replace(
      AI_STYLES_PLACEHOLDER,
      `/* AI 视觉样式开始 */
    /* 例如：
    #slot-0 { background: linear-gradient(135deg, #1a1a2e, #16213e); }
    .kin-card { border-radius: 16px; backdrop-filter: blur(12px); }
    .kin-title { font-size: clamp(32px, 6vw, 72px); font-weight: 800; }
    */
    /* AI 视觉样式结束 */
    `
    );
  }

  // 确保输出目录存在
  mkdirSync(dirname(outputHtmlPath), { recursive: true });
  writeFileSync(outputHtmlPath, html, "utf8");

  return {
    outputPath: outputHtmlPath,
    slotCount: runtime.segments.length,
    segmentCount: runtime.totalSegments,
  };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const [runtimeJson, outputHtml] = process.argv.slice(2);
  if (!runtimeJson || !outputHtml) {
    console.error("用法: npx ts-node runtime/assembler.ts <video-runtime.json> <output.html>");
    process.exit(1);
  }
  const result = assembleRuntimeHtml(runtimeJson, outputHtml);
  console.log("✅ HTML 组装完成");
  console.log("  输出:", result.outputPath);
  console.log("  Slot 数量:", result.slotCount);
}
