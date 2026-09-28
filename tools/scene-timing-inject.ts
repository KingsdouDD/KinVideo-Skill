/**
 * scene_timing_inject — 把句子时间戳按"场景"重新切分，注入 HTML
 *
 * 核心设计：
 *   - 模型只设计 N 个场景（视觉/动画），完全不关心时间
 *   - 工具负责把 M 句话的 (start, end) 切分成 N 段，按 SCENES 的 chapter 自动分组
 *   - 工具往 HTML 注入：
 *       1) SUBTITLE_TIMINGS （原来的逐句时间数组）
 *       2) window._sceneTimings = [{start, end, sentenceIdxRange, chapter}, ...]   ← 新增
 *       3) 每个 .scene DOM 上加 data-start / data-end 属性
 *   - HTML 的 _renderFrame 只负责"当前 sceneIdx 变了 → 切场景"，场景内的动画时长 = data-end - data-start
 *
 * 时间分配策略：
 *   1. chapter 模式 (按 SCENE.chapter 和句子的 chapter 字段匹配)
 *      - 句子带 chapter 字段（来自 narration 注释或外部 metadata）
 *      - 默认按 scene.chapter == sentence.chapter 自动归类
 *   2. 均匀模式 (fallback)
 *      - scene_count 个场景均匀瓜分所有句子的时间
 *      - 每个场景 = floor(sentence_count / scene_count) 句
 *      - 最后一个场景吃掉余数
 *   3. 手动模式 (优先级最高)
 *      - SCENES 里写 spans: [[0,5], [5,12]] 直接覆盖
 *
 * 调用方式：
 *   tool: scene_timing_inject
 *   params: { html_path, sentence_timings_path, scene_count?, strategy?, output_path? }
 *
 * 依赖：
 *   - 复用 subtitle_inject 的 SUBTITLE_TIMINGS 注入逻辑
 *   - 复用 audio_sentence_breakpoints 输出的 timings 格式
 */

import { Type } from "typebox";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

interface SentenceTimingItem {
  index: number;
  start: number;
  end: number;
  text: string;
  chapter?: string;
}

interface SentenceTimingsFile {
  total_duration?: number;
  sentence_count?: number;
  timings: SentenceTimingItem[];
}

interface SceneTiming {
  sceneIdx: number;
  start: number;
  end: number;
  durationSec: number;
  sentenceIdxRange: [number, number];
  sentences: SentenceTimingItem[];
  chapter?: string;
}

interface SceneTimingInjectResult {
  output_html_path: string;
  scene_count: number;
  scene_timings: SceneTiming[];
  strategy: "manual" | "chapter" | "uniform";
  total_duration_s: number;
}

const PLACEHOLDER = "<!-- KINVIDEO:SUBTITLE_TIMINGS -->";
const SCENE_TIMINGS_PLACEHOLDER = "<!-- KINVIDEO:SCENE_TIMINGS -->";
const SCENE_DATA_PLACEHOLDER = "<!-- KINVIDEO:SCENE_DATA_ATTR -->";

function readSentenceTimings(path: string): SentenceTimingsFile {
  if (!existsSync(path)) throw new Error(`断点 JSON 不存在: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * 从 HTML 中提取场景数（优先从 data-scene-idx 属性数，再从 const SCENES = [] 数）
 * 返回场景数和手动 spans 覆盖（如果有）
 */
function inspectScenes(html: string): {
  sceneCount: number;
  manualSpans?: Array<[number, number]>;
} {
  // 1. 从 data-scene-idx 属性计数（推荐路径，模型只要给 DOM 标属性）
  const dataIdxs = new Set<number>();
  const dataRe = /data-scene-idx="(\d+)"/g;
  let dm;
  while ((dm = dataRe.exec(html)) !== null) {
    dataIdxs.add(parseInt(dm[1]));
  }
  const dataSceneCount = dataIdxs.size;

  // 2. 从 const SCENES = [ ... ]; 数组（可选，老格式）
  let sceneArrayCount = 0;
  let manualSpans: Array<[number, number]> | undefined;

  const m = html.match(/const\s+SCENES\s*=\s*\[/);
  if (m) {
    const start = m.index! + m[0].length;
    // 找匹配的 ] （不深入处理嵌套对象，靠括号计数）
    let depth = 0;
    let end = start;
    let inStr: string | null = null;
    for (let i = start; i < html.length; i++) {
      const ch = html[i];
      if (inStr) {
        if (ch === "\\") { i++; continue; }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
      if (ch === "[") depth++;
      else if (ch === "]") {
        if (depth === 0) { end = i; break; }
        depth--;
      }
    }

    const scenesBlock = html.slice(start, end);

    // 数顶层对象的开始 { 数量（粗略，靠括号计数）
    let d = 0;
    let startedInStr: string | null = null;
    for (let i = 0; i < scenesBlock.length; i++) {
      const ch = scenesBlock[i];
      if (startedInStr) {
        if (ch === "\\") { i++; continue; }
        if (ch === startedInStr) startedInStr = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") { startedInStr = ch; continue; }
      if (ch === "{") {
        if (d === 0) sceneArrayCount++;
        d++;
      } else if (ch === "}") d--;
    }

    // 找手动 spans（如果有）
    const spansMatch = scenesBlock.match(/spans\s*:\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/);
    if (spansMatch) {
      manualSpans = [];
      const pairRe = /spans\s*:\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/g;
      let pm;
      while ((pm = pairRe.exec(scenesBlock)) !== null) {
        manualSpans.push([parseInt(pm[1]), parseInt(pm[2])]);
      }
    }
  }

  // 以 data-scene-idx 计数为准（模型首选方式）；数组计数在都没有 DOM 时 fallback
  const sceneCount = dataSceneCount > 0 ? dataSceneCount : sceneArrayCount;

  return { sceneCount, manualSpans };
}

/**
 * 均匀分配：N 句均分给 K 个场景
 * sentenceIdxRange 使用原 timings 数组的原始 index
 * 返回 {localStart, localEnd} + sceneIdx 起点，外层决定 sceneIdx
 */
function uniformStrategy(
  timings: SentenceTimingItem[],
  sceneCount: number
): SceneTiming[] {
  const result: SceneTiming[] = [];
  if (sceneCount === 0) return result;
  const totalSentences = timings.length;
  const base = Math.floor(totalSentences / sceneCount);
  const remainder = totalSentences % sceneCount;

  let cursor = 0;
  for (let i = 0; i < sceneCount; i++) {
    const size = base + (i < remainder ? 1 : 0);
    if (size === 0) continue;
    const localStart = cursor;
    const localEnd = cursor + size - 1;
    const start = timings[localStart].start;
    const end = timings[localEnd].end;
    result.push({
      sceneIdx: i,
      start,
      end,
      durationSec: +(end - start).toFixed(3),
      sentenceIdxRange: [localStart, localEnd],
      sentences: timings.slice(localStart, localEnd + 1),
    });
    cursor += size;
  }
  return result;
}

/**
 * chapter 策略：按 sentence.chapter 字段分组
 * 多个场景共享同一个 chapter → 该 chapter 的时间被这些场景**均分**
 * scene.chapter 从 HTML SCENES 里读
 * 这里需要外部传入 scenes 列表（带 chapter 字段），工具调用方提供
 */
function chapterStrategy(
  timings: SentenceTimingItem[],
  scenesWithChapter: Array<{ idx: number; chapter?: string }>,
  totalSceneCount: number
): SceneTiming[] {
  // sentences 没有 chapter 字段时，fallback 均匀分配
  const hasChapter = timings.some((t) => t.chapter);
  if (!hasChapter) {
    return uniformStrategy(timings, totalSceneCount);
  }

  // 按 chapter 分组场景
  const scenesByChapter = new Map<string, number[]>();
  for (const scene of scenesWithChapter) {
    if (!scene.chapter) continue;
    if (!scenesByChapter.has(scene.chapter)) {
      scenesByChapter.set(scene.chapter, []);
    }
    scenesByChapter.get(scene.chapter)!.push(scene.idx);
  }

  // 追踪已分配的句子 index（防重复）
  const usedIndices = new Set<number>();
  const result: SceneTiming[] = [];

  for (const [chapter, sceneIdxs] of scenesByChapter.entries()) {
    // 找到这个 chapter 的所有句子（按时间排序）
    const matched = timings
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.chapter === chapter);

    if (matched.length === 0) {
      // chapter 没匹配到任何句子
      for (const idx of sceneIdxs) {
        result.push({
          sceneIdx: idx,
          start: 0,
          end: 0,
          durationSec: 0,
          sentenceIdxRange: [-1, -1],
          sentences: [],
          chapter,
        });
      }
      continue;
    }

    // 句子在该 chapter 内**均分**给多个场景
    const sceneCount = sceneIdxs.length;
    const chunkSize = Math.floor(matched.length / sceneCount);
    const remainder = matched.length % sceneCount;

    let cursor = 0;
    for (let s = 0; s < sceneCount; s++) {
      const size = chunkSize + (s < remainder ? 1 : 0);
      if (size === 0) continue;
      const chunk = matched.slice(cursor, cursor + size);
      cursor += size;
      if (chunk.length === 0) continue;
      const startTime = chunk[0].t.start;
      const endTime = chunk[chunk.length - 1].t.end;
      const firstIdx = chunk[0].i;
      const lastIdx = chunk[chunk.length - 1].i;
      for (let k = firstIdx; k <= lastIdx; k++) usedIndices.add(k);
      result.push({
        sceneIdx: sceneIdxs[s],
        start: startTime,
        end: endTime,
        durationSec: +(endTime - startTime).toFixed(3),
        sentenceIdxRange: [firstIdx, lastIdx],
        sentences: chunk.map((c) => c.t),
        chapter,
      });
    }
  }

  // 兜底：剩余未分配的句子 + 任何未在 metadata 中出现的场景一起均匀分配
  const assignedIdxs = new Set(result.map((s) => s.sceneIdx));
  const metadataIdxs = new Set(scenesWithChapter.map((s) => s.idx));
  const sceneIdxsNoChapter = scenesWithChapter
    .filter((s) => !s.chapter)
    .map((s) => s.idx);
  const orphanIdxs = sceneIdxsNoChapter.concat(
    Array.from({ length: totalSceneCount }, (_, i) => i).filter(
      (i) => !metadataIdxs.has(i) && !assignedIdxs.has(i)
    )
  );
  const remainingIndices = timings
    .map((_, i) => i)
    .filter((i) => !usedIndices.has(i));
  const remainingTimings = remainingIndices.map((i) => timings[i]);

  if (orphanIdxs.length > 0 && remainingTimings.length > 0) {
    const fallback = uniformStrategy(remainingTimings, orphanIdxs.length);
    for (let i = 0; i < orphanIdxs.length; i++) {
      const fb = fallback[i];
      if (fb) {
        const [ls, le] = fb.sentenceIdxRange;
        result.push({
          ...fb,
          sceneIdx: orphanIdxs[i],
          sentenceIdxRange: [remainingIndices[ls], remainingIndices[le]],
          sentences: timings.slice(remainingIndices[ls], remainingIndices[le] + 1),
        });
      }
    }
  }

  return result.sort((a, b) => a.sceneIdx - b.sceneIdx);
}

/**
 * 手动 spans 模式
 * spans 数组中未被覆盖的句子由 fallback 场景均匀吃掉
 * 如果 total sceneCount > spans.length，未指定场景会接在 manual 场景后面
 */
function manualStrategy(
  timings: SentenceTimingItem[],
  spans: Array<[number, number]>,
  totalSceneCount: number
): SceneTiming[] {
  const usedIndices = new Set<number>();
  const result: SceneTiming[] = [];

  // manual spans 区段
  for (let idx = 0; idx < spans.length; idx++) {
    const [from, to] = spans[idx];
    const start = timings[from]?.start ?? 0;
    const end = timings[to]?.end ?? start;
    for (let k = from; k <= to; k++) usedIndices.add(k);
    result.push({
      sceneIdx: idx,
      start,
      end,
      durationSec: +(end - start).toFixed(3),
      sentenceIdxRange: [from, to],
      sentences: timings.slice(from, to + 1),
    });
  }

  // fallback：未在 manual spans 中的场景 + 剩余句子
  const remainingSceneCount = totalSceneCount - spans.length;
  const remainingIndices = timings
    .map((_, i) => i)
    .filter((i) => !usedIndices.has(i));
  const remainingTimings = remainingIndices.map((i) => timings[i]);

  if (remainingSceneCount > 0 && remainingTimings.length > 0) {
    const fallback = uniformStrategy(remainingTimings, remainingSceneCount);
    for (let i = 0; i < remainingSceneCount; i++) {
      const fb = fallback[i];
      if (fb) {
        const [ls, le] = fb.sentenceIdxRange;
        result.push({
          ...fb,
          sceneIdx: spans.length + i,
          sentenceIdxRange: [remainingIndices[ls], remainingIndices[le]],
          sentences: timings.slice(remainingIndices[ls], remainingIndices[le] + 1),
        });
      }
    }
  }

  return result.sort((a, b) => a.sceneIdx - b.sceneIdx);
}

/**
 * 给 HTML 里所有 .scene 元素加 data-start / data-end 属性
 */
function applySceneDataAttrs(
  html: string,
  sceneTimings: SceneTiming[]
): string {
  let updated = html;

  // 策略 1: 找占位符精确替换
  if (updated.includes(SCENE_DATA_PLACEHOLDER)) {
    // 让模型在生成 HTML 时预先留一个 <script> 块
    const lines = sceneTimings
      .map(
        (s) =>
          `document.querySelectorAll('[data-scene-idx="${s.sceneIdx}"]').forEach(el => { el.setAttribute('data-start', '${s.start}'); el.setAttribute('data-end', '${s.end}'); el.style.setProperty('--scene-dur', '${s.durationSec}s'); });`
      )
      .join("\n");
    updated = updated.replace(SCENE_DATA_PLACEHOLDER, lines);
    return updated;
  }

  // 策略 2: 直接 DOM 操作脚本注入（fallback）
  // 在 </body> 前插入一段脚本，按 scene 元素加 data 属性
  const sceneInitScript = `
<script>
(function() {
  const _sceneTimings = ${JSON.stringify(sceneTimings, null, 2)};
  window._sceneTimings = _sceneTimings;
  ${sceneTimings.length > 0 ? `
  // 模型渲染场景时，按 data-scene-idx 匹配
  document.querySelectorAll('[data-scene-idx]').forEach(el => {
    const idx = parseInt(el.getAttribute('data-scene-idx'));
    const st = _sceneTimings.find(s => s.sceneIdx === idx);
    if (st) {
      el.setAttribute('data-start', st.start.toFixed(3));
      el.setAttribute('data-end', st.end.toFixed(3));
      el.style.setProperty('--scene-dur', st.durationSec.toFixed(3) + 's');
    }
  });
  ` : ""}
})();
</script>
`;

  // 在 </body> 前插入
  const bodyClose = updated.lastIndexOf("</body>");
  if (bodyClose !== -1) {
    updated = updated.slice(0, bodyClose) + sceneInitScript + updated.slice(bodyClose);
  } else {
    // 没 body 标签就追加到末尾
    updated += sceneInitScript;
  }

  return updated;
}

export function registerSceneTimingInject(api: any) {
  api.registerTool({
    name: "scene_timing_inject",
    description:
      "把句子时间戳按场景切分，注入 HTML。支持 3 种策略：1) manual（SCENES 里写 spans 覆盖）；2) chapter（按 sentence.chapter 和 scene.chapter 匹配）；3) uniform（均匀分配，fallback）。工具自动往 .scene DOM 加 data-start / data-end 属性，模型 _renderFrame 只需读 window._sceneTimings 判断当前应该渲染哪个场景。",
    parameters: Type.Object({
      html_path: Type.String({ description: "index.html 绝对路径" }),
      sentence_timings_path: Type.String({
        description: "audio_sentence_breakpoints 输出的 JSON 路径",
      }),
      strategy: Type.Optional(
        Type.Union(["manual", "chapter", "uniform"], {
          description:
            "时间分配策略。manual 优先（读 SCENES.spans）；chapter 次之（按 chapter 字段匹配）；uniform fallback（均匀分配）。默认 auto 按 manual → chapter → uniform 顺序尝试。",
        })
      ),
      scenes_metadata: Type.Optional(
        Type.String({
          description:
            "可选 JSON 字符串，传 scenes 的 chapter 列表：[{\"idx\":0,\"chapter\":\"OPEN\"},...]。如果 HTML 里的 SCENES 没写 chapter，工具需要外部传入。",
        })
      ),
      output_path: Type.Optional(
        Type.String({
          description: "输出 HTML 路径，默认 = html_path 旁边 _injected.html",
        })
      ),
    }),
    async execute(_id: any, params: any) {
      const {
        html_path,
        sentence_timings_path,
        strategy = "auto",
        scenes_metadata,
        output_path,
      } = params as {
        html_path: string;
        sentence_timings_path: string;
        strategy?: "manual" | "chapter" | "uniform" | "auto";
        scenes_metadata?: string;
        output_path?: string;
      };

      if (!existsSync(html_path)) throw new Error(`HTML 不存在: ${html_path}`);
      const data = readSentenceTimings(sentence_timings_path);
      if (!Array.isArray(data.timings))
        throw new Error("断点 JSON 缺少 timings 数组");

      let html = readFileSync(html_path, "utf8");
      const sceneInfo = inspectScenes(html);

      // 解析 scenes metadata（外部传入的 chapter 信息）
      let scenesMeta: Array<{ idx: number; chapter?: string }> = [];
      if (scenes_metadata) {
        try {
          scenesMeta = JSON.parse(scenes_metadata);
        } catch {
          throw new Error("scenes_metadata 不是合法 JSON");
        }
      }

      // 如果 HTML 里没找到 SCENES 数组 → 用外部传入的 metadata
      const effectiveSceneCount = sceneInfo.sceneCount || scenesMeta.length;

      // 选择策略
      let sceneTimings: SceneTiming[] = [];
      let usedStrategy: "manual" | "chapter" | "uniform" = "uniform";

      const tryOrder: Array<"manual" | "chapter" | "uniform"> =
        strategy === "auto"
          ? ["manual", "chapter", "uniform"]
          : [strategy as any];

      for (const strat of tryOrder) {
        if (strat === "manual" && sceneInfo.manualSpans && sceneInfo.manualSpans.length > 0) {
          sceneTimings = manualStrategy(data.timings, sceneInfo.manualSpans, effectiveSceneCount);
          usedStrategy = "manual";
          break;
        }
        if (strat === "chapter" && scenesMeta.length > 0) {
          const withChapter = scenesMeta.map((m) => ({
            idx: m.idx,
            chapter: m.chapter,
          }));
          // 检查是否真能匹配
          const hasChapterInSentences = data.timings.some((t) => t.chapter);
          if (hasChapterInSentences) {
            sceneTimings = chapterStrategy(data.timings, withChapter, effectiveSceneCount);
            usedStrategy = "chapter";
            break;
          }
        }
        if (strat === "uniform") {
          sceneTimings = uniformStrategy(data.timings, effectiveSceneCount);
          usedStrategy = "uniform";
          break;
        }
      }

      // 1) 注入 SUBTITLE_TIMINGS（复用原 subtitle_inject 逻辑）
      const timingsJs = `const SUBTITLE_TIMINGS = ${JSON.stringify(
        data.timings,
        null,
        2
      )};`;

      if (html.includes(PLACEHOLDER)) {
        // 占位符在 <script> 块内 → 直接替换
        // 占位符在 <body> 中独立存在 → 需要包 <script>
        // 安全起见一律包 <script>
        html = html.replace(PLACEHOLDER, `<script>\n${timingsJs}\n</script>`);
      } else {
        // 没有占位符 → 新开 <script> 块包裹，插入到 </body> 前
        const bodyClose = html.lastIndexOf("</body>");
        if (bodyClose !== -1) {
          html =
            html.slice(0, bodyClose) +
            `<script>\n${timingsJs}\n</script>\n` +
            html.slice(bodyClose);
        } else {
          html += `<script>\n${timingsJs}\n</script>`;
        }
      }

      // 2) 注入 _sceneTimings + DOM data 属性
      html = applySceneDataAttrs(html, sceneTimings);

      // 2.5) 设置 window._totalDuration（如未设）
      const totalDur = (sceneTimings.length > 0
        ? sceneTimings[sceneTimings.length - 1].end
        : data.total_duration || 0);
      if (!/window\._totalDuration\s*=\s*[^;]+;/.test(html)) {
        const tag = `\nwindow._totalDuration = ${totalDur.toFixed(3)};`;
        html = html.replace(/(window\._sceneTimings\s*=\s*_sceneTimings;)/, `$1${tag}`);
      }

      // 写出
      const projectDir = dirname(html_path);
      const output = output_path
        ? resolve(output_path)
        : resolve(projectDir, "index_injected.html");
      writeFileSync(output, html, "utf8");

      const result: SceneTimingInjectResult = {
        output_html_path: output,
        scene_count: sceneTimings.length,
        scene_timings: sceneTimings,
        strategy: usedStrategy,
        total_duration_s: data.total_duration || 0,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  });
}