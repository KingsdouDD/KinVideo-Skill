/**
 * audio_silence_detect — 音频静音段检测（dB 驱动版）
 *
 * 核心设计：
 *   - 只用 dB 阈值检测声音幅度，不控制时间长度
 *   - d=0：不过滤持续时长，所有低于阈值的点全部抽出来
 *   - 按时间聚类（cluster_gap），把相近的点合并成一段静音区
 *   - cluster_end = 静音结束 = 下一句话开始的参考点
 *   - 不做梯度降阈值重试，不重新生成音频
 *
 * 输入：audio_path, noise_threshold（dB，默认 -50dB）, cluster_gap（秒，默认 0.3）
 *       expected_min_silences（期望句子数，仅 warning 判断用）
 * 输出：silence_clusters[]（聚类结果）+ boundaries[]（每句话边界时刻）
 */

import { Type } from "typebox";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

interface SilenceCluster {
  cluster_start: number;   // 聚类起始
  cluster_end: number;     // 聚类结束（= 这句话念完的时刻）
  point_count: number;     // 聚类内点数
  span: number;           // 聚类时间跨度
}

interface DetectResult {
  total_duration: number;
  audio_file: string;
  noise_threshold: string;
  cluster_gap: number;
  silence_cluster_count: number;
  expected_min_silences: number;
  silence_clusters: SilenceCluster[];
  boundaries: number[];
  warning?: string;
}

function getDuration(file: string): number {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
    { encoding: "utf8" }
  ).trim();
  return parseFloat(out);
}

/**
 * 提取所有低于指定 dB 阈值的时刻点（d=0，不过滤时长）
 * silencedetect 输出的 silence_start = 静音开始，silence_end = 静音结束
 */
function extractAllSilencePoints(file: string, noise: string): { starts: number[]; ends: number[] } {
  const out = execSync(
    `ffmpeg -i "${file}" -af "silencedetect=noise=${noise}:d=0" -f null - 2>&1`,
    { encoding: "utf8", maxBuffer: 100 * 1024 * 1024 }
  );
  const starts: number[] = [];
  const ends: number[] = [];
  for (const line of out.split("\n")) {
    const sm = line.match(/silence_start:\s*([\d.]+)/);
    const em = line.match(/silence_end:\s*([\d.]+)/);
    if (sm) starts.push(parseFloat(sm[1]));
    if (em) ends.push(parseFloat(em[1]));
  }
  return { starts: starts.sort((a, b) => a - b), ends: ends.sort((a, b) => a - b) };
}

/**
 * 按 gap 聚类：相邻点差值 < gap → 同一聚类
 * cluster_gap 设大（如 0.3s）可把单词间停顿过滤掉，只保留句子间停顿
 */
function clusterPoints(pts: number[], gap: number): SilenceCluster[] {
  if (pts.length === 0) return [];
  const clusters: SilenceCluster[] = [];
  let cur: SilenceCluster = {
    cluster_start: pts[0],
    cluster_end: pts[0],
    point_count: 1,
    span: 0,
  };
  for (let i = 1; i < pts.length; i++) {
    if (pts[i] - cur.cluster_end <= gap) {
      cur.cluster_end = pts[i];
      cur.point_count++;
    } else {
      cur.span = cur.cluster_end - cur.cluster_start;
      clusters.push(cur);
      cur = {
        cluster_start: pts[i],
        cluster_end: pts[i],
        point_count: 1,
        span: 0,
      };
    }
  }
  cur.span = cur.cluster_end - cur.cluster_start;
  clusters.push(cur);
  return clusters;
}

export function registerAudioSilenceDetect(api: any) {
  api.registerTool({
    name: "audio_silence_detect",
    description:
      "从音频提取静音段作为字幕断点。核心逻辑：只按 dB 阈值检测（d=0 不限制时长），再按时间聚类合并相邻静音点，返回句子边界时刻。",
    parameters: Type.Object({
      audio_path: Type.String({ description: "音频文件绝对路径" }),
      noise_threshold: Type.Optional(
        Type.String({
          description: "dB 阈值，默认 -50dB。越负越严格（比如 -60dB）。",
          default: "-50dB",
        })
      ),
      cluster_gap: Type.Optional(
        Type.Number({
          description:
            "聚类间隔（秒），默认 0.3。相邻静音点差值小于此值则归为同一聚类。设大可过滤单词间停顿（推荐 0.3s）。",
          default: 0.3,
        })
      ),
      expected_min_silences: Type.Optional(
        Type.Number({
          description: "期望句子数（仅供参考，用于 warning 判断）。不传则不强制。",
          default: 0,
        })
      ),
    }),
    async execute(_id: any, params: any) {
      const {
        audio_path,
        noise_threshold = "-50dB",
        cluster_gap = 0.3,
        expected_min_silences = 0,
      } = params as {
        audio_path: string;
        noise_threshold?: string;
        cluster_gap?: number;
        expected_min_silences?: number;
      };

      if (!existsSync(audio_path)) {
        throw new Error(`音频文件不存在: ${audio_path}`);
      }

      const total = getDuration(audio_path);

      // Step 1: 抽所有静音点
      const { starts, ends } = extractAllSilencePoints(audio_path, noise_threshold);

      // Step 2: 聚类（用 ends 作为句子边界参考）
      const clusters = clusterPoints(ends, cluster_gap);

      // Step 3: 每句话的边界 = cluster_end + 0.1s
      const BOUNDARY_OFFSET = 0.1;
      const boundaries = clusters.map(c => +(c.cluster_end + BOUNDARY_OFFSET).toFixed(3));

      // Step 4: 过滤噪音（span 太小的聚类不是真正的句子间停顿）
      const realClusters = clusters.filter(c => c.span > 0.1);

      let warning: string | undefined;
      if (expected_min_silences > 0 && realClusters.length < expected_min_silences - 2) {
        warning = `检测到 ${realClusters.length} 个有效句子边界，期望约 ${expected_min_silences}。可尝试调小 noise_threshold（如 -60dB）或调小 cluster_gap（如 0.2）。`;
      }

      const result: DetectResult = {
        total_duration: +total.toFixed(3),
        audio_file: audio_path,
        noise_threshold,
        cluster_gap,
        silence_cluster_count: realClusters.length,
        expected_min_silences,
        silence_clusters: realClusters,
        boundaries,
        warning,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  });
}
