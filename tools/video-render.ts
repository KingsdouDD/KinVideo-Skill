/**
 * video_render — HTML/CSS/JS 动画 → MP4
 *
 * 核心设计：
 *   - 从 HTML 读 window._totalDuration，读不到报错
 *   - VideoToolbox 硬编码（Mac M 系列 GPU），失败自动 fallback libx264
 *   - .render.lock 文件锁防止并发撞 GPU
 *   - 进度只走 stderr（人工可见，模型不感知，减少 token 消耗）
 *   - 不覆盖同名 video_raw.mp4（防止误覆盖）
 */

import { Type } from "typebox";
import { chromium } from "playwright";
import { spawn, execSync } from "node:child_process";
import { existsSync, statSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";

const PRESETS: Record<string, { width: number; height: number }> = {
  "vertical-9:16": { width: 1080, height: 1920 },
  "vertical-4:3": { width: 1440, height: 1920 },
  "horizontal-16:9": { width: 1920, height: 1080 },
  "horizontal-4:3": { width: 1920, height: 1440 },
  "square-1:1": { width: 1080, height: 1080 },
};

const FPS = 30;
const LOCK_FILE = ".render.lock";

function checkToolAvailable(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function getVideoDuration(file: string): number {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
    { encoding: "utf8" }
  ).trim();
  return parseFloat(out);
}

interface RenderResult {
  video_path: string;
  preset: string;
  width: number;
  height: number;
  fps: number;
  total_duration: number;
  total_frames: number;
  encoder: "h264_videotoolbox" | "libx264";
  size_mb: number;
}

async function renderFrames(
  htmlPath: string,
  width: number,
  height: number,
  totalDuration: number,
  encoder: "h264_videotoolbox" | "libx264",
  outputPath: string
): Promise<void> {
  const ffmpegArgs =
    encoder === "h264_videotoolbox"
      ? [
          "-y",
          "-f", "image2pipe",
          "-vcodec", "mjpeg",
          "-r", String(FPS),
          "-s", `${width}x${height}`,
          "-i", "pipe:0",
          "-c:v", "h264_videotoolbox",
          "-b:v", "10M",
          "-profile:v", "high",
          "-level", "4.1",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
          outputPath,
        ]
      : [
          "-y",
          "-f", "image2pipe",
          "-vcodec", "mjpeg",
          "-r", String(FPS),
          "-s", `${width}x${height}`,
          "-i", "pipe:0",
          "-c:v", "libx264",
          "-preset", "fast",
          "-crf", "18",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
          outputPath,
        ];

  const ffmpeg = spawn("ffmpeg", ffmpegArgs);
  ffmpeg.on("error", (err) => {
    throw new Error(`FFmpeg 启动失败: ${err.message}`);
  });

  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      // ===== GPU 加速渲染（让 Chromium 走 Metal，而不是纯 CPU raster）=====
      "--enable-gpu",
      "--enable-accelerated-2d-canvas",
      "--enable-zero-copy",
      "--ignore-gpu-blocklist",
      "--enable-features=Vulkan,UseSkiaRenderer",
      // WebGL fallback
      "--enable-unsafe-webgpu",
      "--use-gl=angle",
      "--use-angle=gl-goldfish",
      "--enable-webgl",
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.setViewportSize({ width, height });
    await page.goto(`file://${htmlPath}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const totalFrames = Math.ceil(totalDuration * FPS);
    console.error(`  渲染 ${totalFrames} 帧 @ ${FPS}fps`);

    let lastProgress = -1;
    for (let i = 0; i < totalFrames; i++) {
      const t = i / FPS;
      await page.evaluate((tt) => (window as any)._renderFrame(tt), t);
      const buf = await page.screenshot({ type: "jpeg", quality: 92 });
      const ok = ffmpeg.stdin.write(buf);
      if (!ok) {
        await new Promise<void>((res) => ffmpeg.stdin.once("drain", () => res()));
      }
      const pct = Math.floor((i / totalFrames) * 100);
      if (pct >= lastProgress + 10) {
        console.error(`  进度 ${pct}%`);
        lastProgress = pct;
      }
    }
    console.error(`  进度 100%`);
    ffmpeg.stdin.end();

    await new Promise<void>((res) => ffmpeg.on("close", () => res()));
  } finally {
    await browser.close();
  }
}

export function registerVideoRender(api: any) {
  api.registerTool({
    name: "video_render",
    description:
      "HTML/CSS/JS 动画 → MP4。读 window._totalDuration 自动定帧数，VideoToolbox 硬编码（失败 fallback libx264），.render.lock 防并发。进度只走 stderr（模型不感知）。",
    parameters: Type.Object({
      html_path: Type.String({ description: "index.html 绝对路径" }),
      preset: Type.Optional(
        Type.String({
          description:
            "规格预设：vertical-9:16 / vertical-4:3 / horizontal-16:9 / horizontal-4:3 / square-1:1",
          default: "vertical-9:16",
        })
      ),
      output_path: Type.Optional(
        Type.String({
          description: "输出路径。默认 = html 同目录下的 video_raw.mp4",
        })
      ),
      allow_overwrite: Type.Optional(
        Type.Boolean({
          description: "是否允许覆盖已有 video_raw.mp4，默认 false",
          default: false,
        })
      ),
    }),
    async execute(_id: any, params: any) {
      const {
        html_path,
        preset = "vertical-9:16",
        output_path,
        allow_overwrite = false,
      } = params as {
        html_path: string;
        preset?: string;
        output_path?: string;
        allow_overwrite?: boolean;
      };

      if (!existsSync(html_path)) {
        throw new Error(`HTML 文件不存在: ${html_path}`);
      }
      if (!PRESETS[preset]) {
        throw new Error(
          `不支持的 preset: ${preset}。可选: ${Object.keys(PRESETS).join(", ")}`
        );
      }

      const projectDir = dirname(html_path);
      const lockPath = resolve(projectDir, LOCK_FILE);
      if (existsSync(lockPath)) {
        throw new Error(
          `检测到渲染锁文件 ${lockPath}，可能正在渲染或上次异常退出。请检查后删除该文件。`
        );
      }
      writeFileSync(lockPath, String(process.pid), "utf8");

      const { width, height } = PRESETS[preset];
      const finalOutput = output_path
        ? resolve(output_path)
        : resolve(projectDir, "video_raw.mp4");

      if (existsSync(finalOutput) && !allow_overwrite) {
        unlinkSync(lockPath);
        throw new Error(
          `输出文件已存在: ${finalOutput}。设置 allow_overwrite=true 覆盖，或换 output_path。`
        );
      }

      try {
        // 读 window._totalDuration
        const browser = await chromium.launch({
          headless: true,
          executablePath:
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.setViewportSize({ width, height });
        await page.goto(`file://${html_path}`);
        await page.waitForLoadState("networkidle");

        const totalDuration = await page.evaluate(
          () => (window as any)._totalDuration
        );
        await browser.close();

        if (typeof totalDuration !== "number" || totalDuration <= 0) {
          throw new Error(
            `HTML 中没找到 window._totalDuration（或值无效: ${totalDuration}）。必须在 HTML 里声明总时长。`
          );
        }

        console.error(
          `🎬 渲染 ${preset} | ${width}x${height} | 时长 ${totalDuration}s`
        );

        // 优先 VideoToolbox，失败 fallback libx264
        let encoder: "h264_videotoolbox" | "libx264" = "h264_videotoolbox";
        try {
          await renderFrames(html_path, width, height, totalDuration, encoder, finalOutput);
        } catch (vtErr: any) {
          console.error(`⚠️  VideoToolbox 失败: ${vtErr.message}`);
          console.error(`   回退到 libx264 软编码...`);
          encoder = "libx264";
          await renderFrames(html_path, width, height, totalDuration, encoder, finalOutput);
        }

        const stats = statSync(finalOutput);
        const sizeMb = +(stats.size / 1024 / 1024).toFixed(2);
        const actualDuration = getVideoDuration(finalOutput);

        const result: RenderResult = {
          video_path: finalOutput,
          preset,
          width,
          height,
          fps: FPS,
          total_duration: +totalDuration.toFixed(3),
          total_frames: Math.ceil(totalDuration * FPS),
          encoder,
          size_mb: sizeMb,
        };

        // ===== 渲染完成后自动清理临时垃圾（一气呵成）=====
        const cleanup = await cleanupRenderArtifacts();
        if (cleanup.cleaned.length > 0) {
          console.error(
            `🧹 清理 ${cleanup.cleaned.length} 个临时目录，释放 ${(cleanup.totalBytes / 1024).toFixed(1)} MB`
          );
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ...result,
                actual_duration: actualDuration,
                cleanup: {
                  cleaned_count: cleanup.cleaned.length,
                  freed_mb: +(cleanup.totalBytes / 1024).toFixed(2),
                  cleaned: cleanup.cleaned,
                  errors: cleanup.errors,
                },
              }, null, 2),
            },
          ],
        };
      } finally {
        if (existsSync(lockPath)) {
          try {
            unlinkSync(lockPath);
          } catch {
            /* ignore */
          }
        }
      }
    },
  });
}

/**
 * 清理渲染临时垃圾（一气呵成）
 *  - Chromium user-data-dir（Playwright 启动的临时profile，每次产生几百MB）
 *  - /tmp 下 Playwright/Chromium 残留目录
 *  - 残留 .render.lock（finally 里已经删了，这里是兜底）
 *
 * video_raw.mp4 默认保留（视频 mux 还要用），外部工具在混音完成后删。
 *
 * 集成在工具内部：渲染+清理一气呵成，不留给外部脚本。
 */
export async function cleanupRenderArtifacts(): Promise<{ cleaned: string[]; errors: string[]; totalBytes: number }> {
  const cleaned: string[] = [];
  const errors: string[] = [];
  let totalBytes = 0;

  // /tmp 下 Playwright / Chromium 临时目录
  // 实际名字可能是 playwright_chromiumdev_profile-XXXX / playwright_chromium_headless_shell-XXXX
  const patterns = [
    /^playwright_/,                 // playwright_ 开头的都清
    /^puppeteer_/,                  // puppeteer_ 开头的都清
    /^chromium_/,                   // chromium_ 开头的都清
    /^\.org\.chromium\./,           // 隐藏目录
    /^chrome_[a-zA-Z0-9_-]+$/,      // chrome_XXX（Chrome helper profile）
  ];

  try {
    const tmpDirs = execSync("ls -1 /tmp 2>/dev/null", { encoding: "utf8" })
      .split("\n").filter(Boolean);
    for (const d of tmpDirs) {
      if (patterns.some(p => p.test(d))) {
        const full = `/tmp/${d}`;
        try {
          const size = parseInt(
            execSync(`du -sk "${full}" 2>/dev/null | awk '{print $1}'`, { encoding: "utf8" }).trim() || "0",
            10
          );
          totalBytes += size;
          execSync(`rm -rf "${full}"`, { stdio: "ignore" });
          cleaned.push(full);
        } catch (e: any) {
          errors.push(`${full}: ${e.message}`);
        }
      }
    }
  } catch (e: any) {
    errors.push(`ls /tmp: ${e.message}`);
  }

  return { cleaned, errors, totalBytes };
}
