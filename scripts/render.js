/**
 * HTML → MP4 Video Renderer (GPU 加速版)
 * 
 * 改动：
 *   1. 去掉 --disable-gpu，启用 Chromium GPU 加速
 *   2. 用 VideoToolbox h264_videotoolbox 硬编码（比 libx264 快 5-10 倍）
 *   3. 音频时长严格控制视频长度，音画同步
 *
 * 用法：node scripts/render.js /path/to/index.html horizontal-16:9
 * 输出：project_dir/video_raw.mp4（无音轨）
 */

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PRESETS = {
  'vertical-9:16':   { width: 1080, height: 1920 },
  'vertical-4:3':    { width: 1440, height: 1920 },
  'horizontal-16:9': { width: 1920, height: 1080 },
  'horizontal-4:3':  { width: 1920, height: 1440 },
  'square-1:1':      { width: 1080, height: 1080 },
};

const FPS = 30;
const PROJECT_DIR = process.cwd();
const htmlFile = process.argv[2] || path.join(PROJECT_DIR, 'index.html');
const presetName = process.argv[3] || 'vertical-9:16';
const preset = PRESETS[presetName] || PRESETS['vertical-9:16'];
const WIDTH = preset.width;
const HEIGHT = preset.height;
const OUTPUT_RAW = path.join(PROJECT_DIR, 'video_raw.mp4');

console.log(`🎬 渲染: ${presetName} | ${WIDTH}×${HEIGHT} | ${FPS}fps`);
console.log(`📄 HTML: ${htmlFile}`);

async function main() {
  // ── 1. 视频编码：VideoToolbox 硬编码（GPU，Mac M 系列专用）──
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe', '-vcodec', 'mjpeg',
    '-r', String(FPS),
    '-s', `${WIDTH}x${HEIGHT}`,
    '-i', 'pipe:0',
    // GPU 硬编码，比 libx264 快 5-10 倍
    '-c:v', 'h264_videotoolbox',
    '-b:v', '10M',
    '-profile:v', 'high',
    '-level', '4.1',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    OUTPUT_RAW
  ]);
  ffmpeg.on('error', err => { console.error('FFmpeg错误:', err.message); process.exit(1); });

  // ── 2. 启动 Chrome（启用 GPU）──
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      // ✅ 启用 GPU（去掉 --disable-gpu）
      '--enable-unsafe-webgpu',
      '--use-gl=angle',
      '--use-angle=gl-goldfish',
      '--enable-webgl',
    ]
  });

  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });

  await page.goto(`file://${htmlFile}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const totalDur = await page.evaluate(() => window._totalDuration);
  const totalFrames = Math.ceil(totalDur * FPS);
  console.log(`✅ 动画时长: ${totalDur}s, 共 ${totalFrames} 帧`);

  // ── 3. 逐帧截图写入 ffmpeg ──
  for (let i = 0; i < totalFrames; i++) {
    const t = i / FPS;
    await page.evaluate(tt => window._renderFrame(tt), t);
    const buf = await page.screenshot({
      type: 'jpeg',
      quality: 92,
      // 尝试用 PNG 更清晰（M2 GPU 加速下 JPEG 编码也更快）
    });
    const ok = ffmpeg.stdin.write(buf);
    if (!ok) await new Promise(res => ffmpeg.stdin.once('drain', res));
    if (i % 150 === 0) process.stdout.write(`\r  ${((i/totalFrames)*100).toFixed(0)}%`);
  }

  process.stdout.write(`\r  100%\n`);
  ffmpeg.stdin.end();
  await new Promise(res => ffmpeg.on('close', res));
  await browser.close();

  const stats = fs.statSync(OUTPUT_RAW);
  console.log(`✅ 输出: ${OUTPUT_RAW} (${(stats.size/1024/1024).toFixed(2)} MB)`);

  // ── 4. 音频时长对齐 ──
  const audioPath = path.join(PROJECT_DIR, 'audio_full.wav');
  if (fs.existsSync(audioPath)) {
    // 获取音频实际时长
    const audioDur = await new Promise(resolve => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0', audioPath
      ]);
      let out = '';
      ffprobe.stdout.on('data', d => out += d);
      ffprobe.on('close', () => resolve(parseFloat(out.trim()) || 0));
    });
    console.log(`🎙️  音频时长: ${audioDur.toFixed(2)}s`);

    // 用音频长度裁剪视频（避免视频比音频长）
    const FINAL = path.join(PROJECT_DIR, 'final.mp4');
    const mux = spawn('ffmpeg', [
      '-y',
      '-i', OUTPUT_RAW,
      '-i', audioPath,
      '-c:v', 'copy',
      '-c:a', 'aac', '-b:a', '128k',
      '-t', String(audioDur),          // 严格以音频为准
      '-shortest',
      FINAL
    ]);
    await new Promise(res => mux.on('close', res));
    const fstats = fs.statSync(FINAL);
    console.log(`✅ 最终文件: ${FINAL} (${(fstats.size/1024/1024).toFixed(2)} MB)`);

    // 验证时长
    const verify = await new Promise(resolve => {
      const ff = spawn('ffprobe', ['-v','quiet','-show_entries','format=duration','-of','csv=p=0',FINAL]);
      let o = ''; ff.stdout.on('data', d => o += d);
      ff.on('close', () => resolve(parseFloat(o.trim())));
    });
    console.log(`✅ 验证时长: ${verify.toFixed(2)}s（音频 ${audioDur.toFixed(2)}s）差值 ${Math.abs(verify - audioDur).toFixed(2)}s`);
  }
}

main().catch(err => { console.error('❌ 渲染失败:', err.message); process.exit(1); });
