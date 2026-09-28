/**
 * video-runtime-generator.ts
 *
 * Runtime HTML Hook 核心模块
 * 职责：
 *   1. 读取 sentence_timings.json（Timeline 数据）
 *   2. 根据 Segment 数量动态生成 video-runtime.json
 *   3. 生成 runtime-core.js（时间控制基础设施）
 *
 * 核心原则：
 *   - Segment 数量由 Runtime 控制，不给 AI 任何决定权
 *   - AI 只读 video-runtime.json，在 Visual Slot 里填视觉
 *   - Runtime Core 与 Visual Layer 完全解耦
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

export interface SentenceTimingItem {
  index: number;
  start: number;
  end: number;
  text: string;
  chapter?: string;
}

export interface SentenceTimingsFile {
  total_duration?: number;
  sentence_count?: number;
  timings: SentenceTimingItem[];
}

export interface RuntimeSegment {
  segmentIdx: number;
  start: number;          // 秒，Timeline start
  end: number;            // 秒，Timeline end
  durationSec: number;    // end - start
  sentenceIdxRange: [number, number];  // [from, to]
  sentences: SentenceTimingItem[];
  chapter?: string;
  // Visual Layer 的挂载点，AI 在这里填视觉
  visualSlot: {
    containerSelector: string;   // e.g. "#slot-0"
    layoutHint?: string;         // AI 参考的布局提示（可选）
  };
}

export interface VideoRuntime {
  version: "1.0";
  generatedBy: "runtime-html-hook";
  totalDuration: number;   // 秒，总时长
  totalSegments: number;   // Segment 总数
  segments: RuntimeSegment[];
  render: {
    // AI 必须遵守的渲染契约
    requiredSelectors: string[];   // 必须存在的 DOM 选择器
    requiredGlobals: string[];     // 必须实现的全局变量/函数
    runtimeContract: {
      _totalDuration: number;
      _currentTime: number;
      _renderFrame: "function";   // AI 必须提供 _renderFrame 实现
      _sceneTimings: "readonly";   // AI 只能读，不能写
      SUBTITLE_TIMINGS: "readonly";
    };
  };
}

function readTimings(path: string): SentenceTimingsFile {
  if (!existsSync(path)) throw new Error(`Timeline 文件不存在: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * 按 Segment 数量等分 Timeline
 * 每个 Segment 的 start/end/sentences 由 Runtime 计算
 * AI 只能读，不能改
 */
function buildSegments(timings: SentenceTimingItem[], segmentCount: number): RuntimeSegment[] {
  if (segmentCount <= 0) return [];
  const total = timings.length;
  const base = Math.floor(total / segmentCount);
  const remainder = total % segmentCount;

  const segments: RuntimeSegment[] = [];
  let cursor = 0;

  for (let i = 0; i < segmentCount; i++) {
    const size = base + (i < remainder ? 1 : 0);
    if (size === 0) {
      // 空 Segment，给一个占位
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

    // 继承 chapter（如果有的话，取第一个句子的 chapter）
    const chapter = sentences.find((s) => s.chapter)?.chapter;

    segments.push({
      segmentIdx: i,
      start,
      end,
      durationSec: +(end - start).toFixed(3),
      sentenceIdxRange: [localStart, localEnd],
      sentences,
      chapter,
      visualSlot: { containerSelector: `#slot-${i}` },
    });

    cursor += size;
  }

  return segments;
}

export function generateVideoRuntime(
  timingsPath: string,
  outputDir: string,
  options?: {
    segmentCount?: number;  // 不传则自动 = sentence count
    projectName?: string;
  }
): { runtimeJsonPath: string; runtimeCorePath: string; runtime: VideoRuntime } {
  const timings = readTimings(timingsPath);

  // Segment 数量：优先用传入值，否则 = 句子数量（1句1Segment）
  const totalSentences = timings.timings.length;
  const segmentCount = options?.segmentCount ?? totalSentences;

  const segments = buildSegments(timings.timings, segmentCount);
  const totalDuration = segments.length > 0
    ? segments[segments.length - 1].end
    : (timings.total_duration ?? 0);

  const runtime: VideoRuntime = {
    version: "1.0",
    generatedBy: "runtime-html-hook",
    totalDuration: +(totalDuration.toFixed(3)),
    totalSegments: segmentCount,
    segments,
    render: {
      requiredSelectors: [
        "#stage",
        ...segments.map((s) => s.visualSlot.containerSelector),
      ],
      requiredGlobals: [
        "window._totalDuration",
        "window._currentTime",
        "window._renderFrame",
        "window._sceneTimings",
        "SUBTITLE_TIMINGS",
      ],
      runtimeContract: {
        _totalDuration: totalDuration,
        _currentTime: 0,
        _renderFrame: "function",
        _sceneTimings: "readonly",
        SUBTITLE_TIMINGS: "readonly",
      },
    },
  };

  // 写 video-runtime.json
  const runtimeJsonPath = resolve(outputDir, "video-runtime.json");
  writeFileSync(runtimeJsonPath, JSON.stringify(runtime, null, 2), "utf8");

  // 写 runtime-core.js
  const runtimeCorePath = resolve(outputDir, "runtime-core.js");
  writeFileSync(runtimeCorePath, buildRuntimeCore(runtime), "utf8");

  return { runtimeJsonPath, runtimeCorePath, runtime };
}

/**
 * 生成 runtime-core.js
 * 这是固定基础设施，AI 不能修改
 */
function buildRuntimeCore(runtime: VideoRuntime): string {
  const segmentsJson = JSON.stringify(runtime.segments.map((s) => ({
    segmentIdx: s.segmentIdx,
    start: s.start,
    end: s.end,
    durationSec: s.durationSec,
    sentenceIdxRange: s.sentenceIdxRange,
    chapter: s.chapter,
  })), null, 2);

  return `/**
 * runtime-core.js — Runtime HTML Hook 生成
 * ⚠️ 此文件由 Runtime 自动生成，AI 禁止修改
 *
 * 职责：
 *   - window._totalDuration  总时长（秒）
 *   - window._currentTime    当前播放时间
 *   - window._sceneTimings   Segment 时间表（只读）
 *   - window._renderFrame(t) 主渲染回调，驱动 renderAt(t)
 */

(function () {
  "use strict";

  // ─── Runtime 数据（只读）──────────────────────────────
  window._totalDuration = ${runtime.totalDuration};
  window._currentTime = 0;

  // Segment 时间表，AI 只能读，不能改写
  window._sceneTimings = ${segmentsJson};

  // 字幕时间表（由 audio_sentence_breakpoints 工具注入）
  // AI 只能读 SUBTITLE_TIMINGS，不能修改
  // window.SUBTITLE_TIMINGS 会在 index.html 中通过占位符注入

  // ─── 当前状态 ────────────────────────────────────────
  let _activeSegmentIdx = -1;
  let _activeSubtitleIdx = -1;

  // ─── 核心渲染函数 ────────────────────────────────────
  // AI 需要在 visual-design.js 中覆盖此函数
  // 推荐实现：AI 的 _renderFrame 读 _currentTime，算当前 segmentIdx，
  //          然后显示/隐藏对应的 Visual Slot
  window._renderFrame = window._renderFrame || function (t) {
    window._currentTime = t;
    // 默认实现：按 segmentIdx 切换可见性
    const seg = window._sceneTimings.find(
      (s) => t >= s.start && t < s.end
    );
    if (seg && seg.segmentIdx !== _activeSegmentIdx) {
      _activeSegmentIdx = seg.segmentIdx;
    }
  };

  // ─── 确定性时间渲染（FFmpeg / Headless 兼容）─────────
  // renderAt(t) 接受任意时间，返回那一刻的完整渲染状态
  // 不依赖 Date.now()、随机数、requestAnimationFrame 累计
  window._renderAt = window._renderAt || function (t) {
    // 找当前 Segment
    const seg = window._sceneTimings.find(
      (s) => t >= s.start && t < s.end
    ) || null;

    // 找当前字幕
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

  // ─── Slot 可见性控制（默认实现）──────────────────────
  // AI 可以覆盖此函数来自定义转场动画
  window._showSlot = window._showSlot || function (idx) {
    document.querySelectorAll("[data-slot-idx]").forEach((el) => {
      el.setAttribute("data-active", idx.toString());
    });
  };

})();
`;
}

// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const timingsPath = args[0];
  const outputDir = args[1] || ".";
  if (!timingsPath) {
    console.error("用法: npx ts-node runtime/video-runtime-generator.ts <sentence_timings.json> [output_dir]");
    process.exit(1);
  }
  const result = generateVideoRuntime(timingsPath, outputDir);
  console.log("✅ Runtime 生成完成");
  console.log("  video-runtime.json:", result.runtimeJsonPath);
  console.log("  runtime-core.js:   ", result.runtimeCorePath);
  console.log("  Segment 数量:      ", result.runtime.totalSegments);
  console.log("  总时长:            ", result.runtime.totalDuration, "秒");
}
