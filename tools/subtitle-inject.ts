/**
 * subtitle_inject — 把断点 JSON 自动注入 HTML 的 SUBTITLE_TIMINGS 数组
 *
 * 核心设计：
 *   - 模型不用手动 grep + replace 时间戳
 *   - 占位符 // KINVIDEO:SUBTITLE_TIMINGS 定位注入点
 *   - 占位符缺失 → 自动在 <script> 末尾追加
 *   - 返回注入后的 HTML 路径（写到 _injected.html）
 *
 * 支持 3 种输入格式（自动识别）：
 *   1. audio_sentence_breakpoints 输出：{ timings: [{index,start,end,text}] }（推荐）
 *   2. audio_silence_detect 输出：{ silence_clusters: [...] }
 *   3. 旧版 silences 数据：{ silences: [...] }
 *
 * 输出 HTML 里的 SUBTITLE_TIMINGS 数组：
 *   const SUBTITLE_TIMINGS = [
 *     { start: 0.0,   end: 2.36,  text: "第一句..." },
 *     { start: 2.36,  end: 9.07,  text: "第二句..." },
 *     ...
 *   ];
 *
 * HTML 里 _renderFrame 必须按 SUBTITLE_TIMINGS 切换场景动画（动画时长 = 句时长）。
 */

import { Type } from "typebox";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

interface Cluster {
  cluster_start: number;
  cluster_end: number;
  point_count?: number;
  span?: number;
}

interface LegacySilence {
  start: number;
  end: number;
  duration: number;
}

interface InjectResult {
  output_html_path: string;
  scene_count: number;
  subtitle_timings: Array<{ start: number; end: number; text: string }>;
  used_format: "sentence_timings" | "cluster" | "legacy";
}

interface SentenceTimingItem {
  index: number;
  start: number;
  end: number;
  text: string;
}

interface SentenceTimingsFile {
  total_duration?: number;
  sentence_count?: number;
  timings: SentenceTimingItem[];
}

const PLACEHOLDER = "<!-- KINVIDEO:SUBTITLE_TIMINGS -->";
const START_OFFSET = 0.1; // 静音结束 + 0.1s 作为下一句开始

function parseNarration(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 用新 cluster 数据构建时间轴
 * 每个 cluster_end = 这句话念完的时刻
 * 每个 cluster_start = 下一句话开始的时刻
 * 第 0 句没有"念完"的 cluster（开头），用 0 作为起点
 */
function buildTimingsFromClusters(
  clusters: Cluster[],
  sentences: string[]
): Array<{ start: number; end: number; text: string }> {
  const timings: Array<{ start: number; end: number; text: string }> = [];

  // 第 1 句：从 0 开始，到第 0 个 cluster_start 结束
  // 第 N 句：从 cluster[N-1].cluster_end 开始，到 cluster[N].cluster_start 结束
  const starts: number[] = [];
  const ends: number[] = [];

  starts.push(0);
  for (let i = 0; i < clusters.length; i++) {
    starts.push(+(clusters[i].cluster_end + START_OFFSET).toFixed(3));
    ends.push(+clusters[i].cluster_start.toFixed(3));
  }
  ends.push(+clusters[clusters.length - 1].cluster_end.toFixed(3));

  const n = Math.max(sentences.length, starts.length);
  for (let i = 0; i < n; i++) {
    const text = sentences[i] ?? `场景 ${i + 1}`;
    timings.push({
      start: i < starts.length ? starts[i] : 0,
      end: i < ends.length ? ends[i] : starts[i] + 2,
      text,
    });
  }
  return timings;
}

/**
 * 兼容旧版 silences[] 数据
 */
function buildTimingsFromLegacy(
  silences: LegacySilence[],
  sentences: string[]
): Array<{ start: number; end: number; text: string }> {
  const timings: Array<{ start: number; end: number; text: string }> = [];
  let t = 0;
  for (let i = 0; i < silences.length; i++) {
    const s = silences[i];
    const next = silences[i + 1];
    const end = next ? next.start : s.end;
    const text = sentences[i] ?? `场景 ${i + 1}`;
    timings.push({
      start: +t.toFixed(3),
      end: +end.toFixed(3),
      text,
    });
    t = (next ? next.end : end) + 0.2;
  }
  return timings;
}

export function registerSubtitleInject(api: any) {
  api.registerTool({
    name: "subtitle_inject",
    description:
      "把断点 JSON 注入 HTML 的 SUBTITLE_TIMINGS 数组。自动识别 3 种格式：1) audio_sentence_breakpoints 输出的 sentence_timings 格式（推荐）；2) audio_silence_detect cluster 格式；3) 旧版 silences 格式。占位符 // KINVIDEO:SUBTITLE_TIMINGS 定位，缺失则自动追加。",
    parameters: Type.Object({
      html_path: Type.String({ description: "index.html 绝对路径" }),
      silence_json_path: Type.String({
        description: "断点 JSON 路径（sentence_timings / silence_clusters / silences 任一格式）",
      }),
      narration_path: Type.Optional(
        Type.String({ description: "narration.txt 路径（可选，用于给字幕配文字）" })
      ),
      output_path: Type.Optional(
        Type.String({
          description: "输出 HTML 路径。默认 = html_path 旁边 _injected.html",
        })
      ),
    }),
    async execute(_id: any, params: any) {
      const {
        html_path,
        silence_json_path,
        narration_path,
        output_path,
      } = params as {
        html_path: string;
        silence_json_path: string;
        narration_path?: string;
        output_path?: string;
      };

      if (!existsSync(html_path)) throw new Error(`HTML 不存在: ${html_path}`);
      if (!existsSync(silence_json_path))
        throw new Error(`断点 JSON 不存在: ${silence_json_path}`);

      const silenceData = JSON.parse(readFileSync(silence_json_path, "utf8"));

      // 自动识别格式
      let timings: Array<{ start: number; end: number; text: string }>;
      let usedFormat: "sentence_timings" | "cluster" | "legacy";

      if (Array.isArray(silenceData.timings) && silenceData.timings.length > 0 && typeof silenceData.timings[0].start === "number") {
        // 新格式：audio_sentence_breakpoints 输出，直接拿 timings 数组
        timings = silenceData.timings.map((t: SentenceTimingItem) => ({
          start: t.start,
          end: t.end,
          text: t.text,
        }));
        usedFormat = "sentence_timings";
      } else if (silenceData.silence_clusters && Array.isArray(silenceData.silence_clusters)) {
        const sentences =
          narration_path && existsSync(narration_path)
            ? parseNarration(readFileSync(narration_path, "utf8"))
            : [];
        timings = buildTimingsFromClusters(silenceData.silence_clusters, sentences);
        usedFormat = "cluster";
      } else if (silenceData.silences && Array.isArray(silenceData.silences)) {
        const sentences =
          narration_path && existsSync(narration_path)
            ? parseNarration(readFileSync(narration_path, "utf8"))
            : [];
        timings = buildTimingsFromLegacy(silenceData.silences, sentences);
        usedFormat = "legacy";
      } else {
        throw new Error("断点 JSON 格式无效：缺少 timings / silence_clusters / silences 字段");
      }

      let html = readFileSync(html_path, "utf8");
      const timingsJs = `const SUBTITLE_TIMINGS = ${JSON.stringify(timings, null, 2)};`;

      let finalHtml: string;
      if (html.includes(PLACEHOLDER)) {
        // 占位符一律包 <script>（安全起见，不管原 HTML 上下文）
        finalHtml = html.replace(PLACEHOLDER, `<script>\n${timingsJs}\n</script>`);
      } else {
        // 没有占位符 → 新开 <script> 块包裹，插入到 </body> 前
        const bodyClose = html.lastIndexOf("</body>");
        if (bodyClose !== -1) {
          finalHtml =
            html.slice(0, bodyClose) +
            `<script>\n${timingsJs}\n</script>\n` +
            html.slice(bodyClose);
        } else {
          finalHtml = `${html}\n<script>\n${timingsJs}\n</script>\n`;
        }
      }

      const projectDir = dirname(html_path);
      const output = output_path
        ? resolve(output_path)
        : resolve(projectDir, "index_injected.html");

      writeFileSync(output, finalHtml, "utf8");

      const result: InjectResult = {
        output_html_path: output,
        scene_count: timings.length,
        subtitle_timings: timings,
        used_format: usedFormat,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  });
}