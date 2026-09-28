/**
 * runtime-html-hook.ts — 注册为 OpenClaw 工具
 *
 * 接收 sentence_timings.json → 输出固定 HTML 渲染架构
 *
 * 职责：
 *   1. 读取断点数据
 *   2. 生成 video-runtime.json（固定契约，Segment 数量/时间由 Runtime 控制）
 *   3. 生成 runtime-core.js（时间控制基础设施，AI 禁止修改）
 *   4. 组装基础 HTML（含 N 个 Visual Slot，AI 只能在 Slot 内部填视觉）
 *
 * 硬约束（通过代码强制，非 Prompt）：
 *   - Segment 数量由 Runtime 根据 sentence_timings 自动计算
 *   - 每个 Segment 的 start/end/duration 由 Runtime 计算
 *   - DOM 结构 (#stage / [data-slot-idx] / [data-active]) 固定不可改
 *   - Runtime 接口 (_sceneTimings / _renderFrame / _renderAt) 只能读/覆盖，不能删
 */

import { Type } from "typebox";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

export function registerRuntimeHtmlHook(api: any) {
  api.registerTool({
    name: "runtime_html_hook",
    description:
      "Runtime HTML Hook：接收 sentence_timings.json，生成固定 HTML 渲染架构。" +
      "输出 video-runtime.json（固定契约）+ index.html（含 N 个 Visual Slot）。" +
      "Segment 数量/时间/Runtime 接口全部由 Runtime 控制，AI 只能在 Visual Slot 内填视觉。" +
      "必须先调 audio_sentence_breakpoints 拿到 sentence_timings.json 后再调此工具。",
    parameters: Type.Object({
      sentence_timings_path: Type.String({
        description: "audio_sentence_breakpoints 输出的 sentence_timings.json 路径",
      }),
      output_dir: Type.String({
        description: "输出目录路径",
      }),
      segment_count: Type.Optional(
        Type.Number({
          description: "固定 Segment 数量（不传则自动=句子数量，即1句1Segment）",
        })
      ),
    }),
    async execute(_id: any, params: any) {
      const {
        sentence_timings_path,
        output_dir,
        segment_count,
      } = params as {
        sentence_timings_path: string;
        output_dir: string;
        segment_count?: number;
      };

      if (!existsSync(sentence_timings_path)) {
        throw new Error(
          `sentence_timings.json 不存在: ${sentence_timings_path}\n` +
          `请先调 audio_sentence_breakpoints 工具生成断点数据。`
        );
      }

      // ─── 读取断点数据 ───────────────────────────────────
      const timingsData = JSON.parse(readFileSync(sentence_timings_path, "utf8"));
      if (!Array.isArray(timingsData.timings)) {
        throw new Error("sentence_timings.json 缺少 timings 数组");
      }
      const timings = timingsData.timings;
      const totalDuration = timingsData.total_duration ||
        (timings.length > 0 ? timings[timings.length - 1].end : 0);

      // ─── 计算 Segment 数量 ────────────────────────────────
      // 由 Runtime 控制，不给 AI 决定权
      const effectiveSegmentCount =
        segment_count ?? timings.length;

      // ─── 构建 segments ───────────────────────────────────
      const segments = buildSegments(timings, effectiveSegmentCount);

      // ─── 写 video-runtime.json ───────────────────────────
      const runtimeJsonPath = resolve(output_dir, "video-runtime.json");
      mkdirSync(dirname(runtimeJsonPath), { recursive: true });

      const runtimeJson = {
        version: "1.0",
        generatedBy: "runtime-html-hook",
        totalDuration: +totalDuration.toFixed(3),
        totalSegments: effectiveSegmentCount,
        segments: segments.map((seg) => ({
          segmentIdx: seg.segmentIdx,
          start: seg.start,
          end: seg.end,
          durationSec: seg.durationSec,
          sentenceIdxRange: seg.sentenceIdxRange,
          chapter: seg.chapter,
          visualSlot: { containerSelector: `#slot-${seg.segmentIdx}` },
        })),
        render: {
          requiredSelectors: [
            "#stage",
            ...segments.map((s) => `#slot-${s.segmentIdx}`),
          ],
          requiredGlobals: [
            "window._totalDuration",
            "window._currentTime",
            "window._renderFrame",
            "window._sceneTimings",
            "SUBTITLE_TIMINGS",
          ],
          runtimeContract: {
            _totalDuration: "readonly",
            _currentTime: "writable",
            _renderFrame: "must_override",
            _sceneTimings: "readonly",
            SUBTITLE_TIMINGS: "readonly",
          },
        },
      };
      writeFileSync(runtimeJsonPath, JSON.stringify(runtimeJson, null, 2), "utf8");

      // ─── 写 runtime-core.js ──────────────────────────────
      const runtimeCorePath = resolve(output_dir, "runtime-core.js");
      writeFileSync(runtimeCorePath, buildRuntimeCore(segments, totalDuration), "utf8");

      // ─── 组装基础 index.html ──────────────────────────────
      const indexHtmlPath = resolve(output_dir, "index.html");
      const indexHtml = buildIndexHtml(segments, timings, totalDuration);
      writeFileSync(indexHtmlPath, indexHtml, "utf8");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                output_dir,
                video_runtime_json: runtimeJsonPath,
                runtime_core_js: runtimeCorePath,
                index_html: indexHtmlPath,
                segment_count: effectiveSegmentCount,
                total_duration_s: +totalDuration.toFixed(3),
                slots: segments.map((s) => ({
                  slot: `#slot-${s.segmentIdx}`,
                  segment: s.segmentIdx,
                  start: s.start.toFixed(3),
                  end: s.end.toFixed(3),
                  dur: `${s.durationSec.toFixed(3)}s`,
                  sentences: s.sentences.map((sent) => sent.text.substring(0, 20)),
                })),
                ai_constraints: {
                  "✅ 可以": [
                    "在 #slot-N 内部自由设计视觉",
                    "覆盖 window._renderFrame 实现动画",
                    "写 visual-design.js 填充视觉逻辑",
                    "修改 #stage 背景样式",
                  ],
                  "❌ 禁止": [
                    "修改 #stage DOM 结构",
                    "删除/修改 [data-slot-idx] 属性",
                    "修改 runtime-core.js",
                    "手写 Segment 时间戳",
                    "删除 Runtime 全局接口",
                  ],
                },
              },
              null,
              2
            ),
          },
        ],
      };
    },
  });
}

// ─── 内部函数 ────────────────────────────────────────────────

interface Segment {
  segmentIdx: number;
  start: number;
  end: number;
  durationSec: number;
  sentenceIdxRange: [number, number];
  sentences: Array<{ index: number; start: number; end: number; text: string; chapter?: string }>;
  chapter?: string;
}

function buildSegments(
  timings: Array<{ index: number; start: number; end: number; text: string; chapter?: string }>,
  segmentCount: number
): Segment[] {
  if (segmentCount <= 0) return [];
  const total = timings.length;
  const base = Math.floor(total / segmentCount);
  const remainder = total % segmentCount;

  const segments: Segment[] = [];
  let cursor = 0;

  for (let i = 0; i < segmentCount; i++) {
    const size = base + (i < remainder ? 1 : 0);
    if (size === 0) {
      segments.push({
        segmentIdx: i,
        start: 0,
        end: 0,
        durationSec: 0,
        sentenceIdxRange: [-1, -1],
        sentences: [],
        visualSlot: { containerSelector: `#slot-${i}` },
      });
      continue;
    }

    const localStart = cursor;
    const localEnd = cursor + size - 1;
    const start = timings[localStart].start;
    const end = timings[localEnd].end;
    const sentences = timings.slice(localStart, localEnd + 1);
    const chapter = sentences.find((s) => s.chapter)?.chapter;

    segments.push({
      segmentIdx: i,
      start,
      end,
      durationSec: +(end - start).toFixed(3),
      sentenceIdxRange: [localStart, localEnd],
      sentences,
      chapter,
    });

    cursor += size;
  }

  return segments;
}

function buildRuntimeCore(
  segments: Segment[],
  totalDuration: number
): string {
  const segmentsJson = JSON.stringify(
    segments.map((s) => ({
      segmentIdx: s.segmentIdx,
      start: s.start,
      end: s.end,
      durationSec: s.durationSec,
      sentenceIdxRange: s.sentenceIdxRange,
      chapter: s.chapter,
    })),
    null,
    2
  );

  return `/**
 * runtime-core.js — Runtime HTML Hook 生成
 * ⚠️ 此文件由 Runtime 自动生成，AI 禁止修改
 */
(function () {
  "use strict";
  window._totalDuration = ${+totalDuration.toFixed(3)};
  window._currentTime = 0;
  window._sceneTimings = ${segmentsJson};

  let _activeSegmentIdx = -1;

  window._renderFrame = window._renderFrame || function (t) {
    window._currentTime = t;
    const seg = window._sceneTimings.find(
      (s) => t >= s.start && t < s.end
    );
    if (seg) _activeSegmentIdx = seg.segmentIdx;
  };

  window._renderAt = window._renderAt || function (t) {
    const seg = window._sceneTimings.find(
      (s) => t >= s.start && t < s.end
    ) || null;
    const sub = (window.SUBTITLE_TIMINGS || []).find(
      (s) => t >= s.start && t < s.end
    ) || null;
    return {
      time: t,
      segmentIdx: seg ? seg.segmentIdx : -1,
      segmentStart: seg ? seg.start : 0,
      segmentEnd: seg ? seg.end : 0,
      segmentDur: seg ? seg.durationSec : 0,
      subtitleIdx: sub ? sub.index : -1,
      subtitleText: sub ? sub.text : "",
    };
  };

  window._showSlot = window._showSlot || function (idx) {
    document.querySelectorAll("[data-slot-idx]").forEach((el) => {
      el.setAttribute("data-active", idx.toString());
    });
  };
})();`;
}

function buildIndexHtml(segments: Segment[], timings: Array<{index:number;start:number;end:number;text:string;chapter?:string}>, totalDuration: number): string {
  const slotsHtml = segments
    .map((seg) => {
      const preview = seg.sentences.length > 0
        ? seg.sentences.map((s) => s.text).join(" / ")
        : "(空 Segment)";
      return [
        `    <div id="slot-${seg.segmentIdx}"`,
        `         data-slot-idx="${seg.segmentIdx}"`,
        `         data-segment-start="${seg.start.toFixed(3)}"`,
        `         data-segment-end="${seg.end.toFixed(3)}"`,
        `         data-segment-dur="${seg.durationSec.toFixed(3)}"`,
        `         data-active="false">`,
        `      <!-- ──────────────────────────────────────── -->`,
        `      <!-- ╔══════════════════════════════════════════════════════╗ -->`,
        `      <!-- ║ Segment ${seg.segmentIdx}: ${seg.start.toFixed(2)}s ~ ${seg.end.toFixed(2)}s (${seg.durationSec.toFixed(2)}s)       ║ -->`,
        `      <!-- ║ 语音: ${preview.substring(0, 46)}${preview.length > 46 ? "..." : ""}  ║ -->`,
        `      <!-- ⚠️ 禁止使用黑色背景 / 深色背景 / 纯色背景，背景必须浅色系 -->`,
        `      <!-- AI 在这里填视觉（可改 #slot-${seg.segmentIdx} 内部一切内容） -->`,
        `      <div class="slot-content" data-slot-content="${seg.segmentIdx}">`,
        `        <p style="color:#888;font:14px system-ui;margin:24px">[ TODO: AI 填视觉内容，禁止使用深色/黑色/纯色背景，深色主题请用 #0a0a0f ]</p>`,
        `      </div>`,
        `    </div>`
      ].join("\n");
    })
    .join("\n\n");

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KinVideo — Runtime HTML</title>
  <style>
    /* ═══ Runtime 锁定的基础结构（禁止修改）════ */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 100vw; height: 100vh; overflow: hidden; background: #08080d; font-family: system-ui, sans-serif; }
    #stage { position: relative; width: 100%; height: 100%; }
    [data-slot-idx] {
      position: absolute; inset: 0;
      display: none; opacity: 0;
      transition: opacity 0.3s;
    }
    [data-slot-idx][data-active="true"] { display: flex; opacity: 1; }
    #subtitle-layer {
      position: fixed; bottom: 8%; left: 0; right: 0;
      text-align: center; pointer-events: none; z-index: 100;
    }
    .subtitle-text {
      display: inline-block; padding: 8px 24px;
      background: rgba(0,0,0,0.65); color: #fff;
      font-size: clamp(16px, 3vw, 28px);
      border-radius: 6px; letter-spacing: 0.05em;
    }
    /* ═══ AI 样式区（AI 在这里写视觉 CSS）════ */
    /* KINVIDEO:AI_STYLES */
    /* TODO: AI 在这里写 .slot-content 的视觉样式 */
  </style>
</head>
<body>

  <div id="stage">
    <!-- ╔══════════════════════════════════════════════════════╗
         ║  Runtime 保留：Visual Slot（数量 = Segment 数量） ║
         ║  AI 只能改 [data-slot-content] 内部，禁止改外层结构 ║
         ╚══════════════════════════════════════════════════════╝ -->
${slotsHtml}
  </div>

  <div id="subtitle-layer">
    <span class="subtitle-text" id="subtitle-text"></span>
  </div>

  <!-- Runtime Core（由 runtime-html-hook 注入，AI 禁止修改） -->
  <script>
  window._totalDuration = ${+totalDuration.toFixed(3)};
  window._currentTime = 0;
  window._sceneTimings = ${JSON.stringify(
    segments.map((s) => ({
      segmentIdx: s.segmentIdx,
      start: s.start,
      end: s.end,
      durationSec: s.durationSec,
      sentenceIdxRange: s.sentenceIdxRange,
      chapter: s.chapter,
    }))
  )};
  window.SUBTITLE_TIMINGS = ${JSON.stringify(
    timings.map((t) => ({
      index: t.index,
      start: t.start,
      end: t.end,
      text: t.text,
    }))
  )};
  (function () {
    var _subText = document.getElementById("subtitle-text");
    var _lastSlotIdx = -1;
    function _switchSlot(idx) {
      if (idx === _lastSlotIdx) return;
      _lastSlotIdx = idx;
      document.querySelectorAll("[data-slot-idx]").forEach(function(el) {
        el.setAttribute("data-active", el.getAttribute("data-slot-idx") === String(idx) ? "true" : "false");
      });
    }
    function _updateSubtitle(t) {
      var sub = (window.SUBTITLE_TIMINGS || []).find(
        function(s) { return t >= s.start && t < s.end; }
      );
      if (_subText) _subText.textContent = sub ? sub.text : "";
    }
    var _origRender = window._renderFrame;
    window._renderFrame = function (t) {
      if (_origRender) _origRender(t);
      _updateSubtitle(t);
      var seg = window._sceneTimings.find(function(s) { return t >= s.start && t < s.end; });
      if (seg) _switchSlot(seg.segmentIdx);
    };
  })();
  </script>

  <!-- AI 视觉脚本区（AI 在这里写 JS 逻辑） -->
  <script>
  /* KINVIDEO:VISUAL_JS */
  /* TODO: AI 在这里写视觉动画 JS（可选） */
  </script>

</body>
</html>`;
}
