/**
 * capture.js — 音画同步录制（GPU 加速）
 * 
 * 核心原理：
 *   canvas.requestAnimationFrame 驱动动画 → MediaRecorder 捕获 canvas stream
 *   同时用 AudioContext 播放音频 → 音频和画面由同一个 RAF 时钟驱动，天然同步
 *
 * 用法：
 *   node scripts/capture.js /path/to/index.html horizontal-16:9
 * 
 * 输出：
 *   project_dir/recordings/final.mp4
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
const presetName = process.argv[3] || 'horizontal-16:9';
const preset = PRESETS[presetName] || PRESETS['horizontal-16:9'];
const WIDTH = preset.width;
const HEIGHT = preset.height;

const outDir = path.join(PROJECT_DIR, 'recordings');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log(`🎬 音画同步录制: ${presetName} | ${WIDTH}×${HEIGHT}`);

async function main() {
  // ── 1. Launch Chrome with GPU 加速 ──
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=gl-goldfish',
    ]
  });

  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });

  const pageUrl = `file://${htmlFile}`;

  // ── 2. 注入 capture runtime ──
  // 这个脚本在页面加载后运行，负责：音频加载 + RAF录屏 + 音画同步
  const captureCode = `
(function() {
  const TOTAL = window._totalDuration;
  const AUDIO_PATH = window._audioPath;
  if (!TOTAL) { window._captureError = 'no _totalDuration'; return; }

  const PAGE_W = 1920, PAGE_H = 1080;

  // ── Canvas setup ──
  const canvas = document.createElement('canvas');
  canvas.width = ${WIDTH}; canvas.height = ${HEIGHT};
  canvas.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Scale so page fits canvas letterbox-style
  const scaleX = ${WIDTH} / PAGE_W;
  const scaleY = ${HEIGHT} / PAGE_H;
  const scale = Math.min(scaleX, scaleY);
  const offX = (${WIDTH} - PAGE_W * scale) / 2;
  const offY = (${HEIGHT} - PAGE_H * scale) / 2;

  // ── Audio (fetch as ArrayBuffer, decode with AudioContext) ──
  let audioBuffer = null;
  let audioCtx = null;

  async function loadAudio() {
    try {
      const resp = await fetch('file://' + AUDIO_PATH);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const buf = await resp.arrayBuffer();
      audioCtx = new AudioContext();
      audioBuffer = await audioCtx.decodeAudioData(buf);
      console.log('Audio loaded:', audioBuffer.duration, 's');
    } catch(e) {
      console.error('Audio load failed:', e.message);
      window._captureError = 'Audio load failed: ' + e.message;
    }
  }

  // ── Draw one frame at time t ──
  function drawFrame(t) {
    // Tell the page to render at this time
    if (window._renderFrame) window._renderFrame(t);

    // Paint canvas: dark background
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, ${WIDTH}, ${HEIGHT});

    // Clone body to render without moving the live page
    const clone = document.body.cloneNode(true);
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;left:0;top:0;width:1920px;height:1080px;overflow:hidden;z-index:-1';
    div.appendChild(clone);
    document.body.appendChild(div);

    // Serialize to SVG -> img -> canvas
    const svgStart = '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">';
    const svgEnd = '</svg>';
    const fo = '<foreignObject width="1920" height="1080"><div xmlns="http://www.w3.org/1999/xhtml" style="width:1920px;height:1080px">' + div.outerHTML + '</div></foreignObject>';
    const svg = svgStart + fo + svgEnd;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.style.cssText = 'position:fixed;left:-9999px';
    img.width = 1920; img.height = 1080;
    document.body.appendChild(img);

    return new Promise(resolve => {
      img.onload = () => {
        ctx.drawImage(img, offX, offY, PAGE_W * scale, PAGE_H * scale);
        URL.revokeObjectURL(url);
        img.remove();
        div.remove();
        resolve();
      };
      img.onerror = () => {
        ctx.fillStyle = '#0a0e27';
        ctx.fillRect(0, 0, ${WIDTH}, ${HEIGHT});
        URL.revokeObjectURL(url);
        img.remove();
        div.remove();
        resolve();
      };
      img.src = url;
    });
  }

  // ── MediaRecorder ──
  let mr = null, recorderStream = null;

  async function startRecording() {
    await loadAudio();
    if (!audioBuffer) {
      window._captureError = 'Audio failed to load';
      return;
    }

    // Canvas capture stream
    recorderStream = canvas.captureStream(${FPS});

    // Mix audio into stream
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);
    source.connect(audioCtx.destination); // also play locally so we hear it
    recorderStream.addTrack(dest.stream.getAudioTracks()[0]);
    source.start(0);

    // Record
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm';
    mr = new MediaRecorder(recorderStream, {
      mimeType,
      videoBitsPerSecond: 10000000
    });

    const chunks = [];
    mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const reader = new FileReader();
      reader.onload = () => {
        const buf = Buffer.from(reader.result);
        require('fs').writeFileSync('/tmp/capture_output.webm', buf);
        window._capturePath = '/tmp/capture_output.webm';
      };
      reader.readAsArrayBuffer(blob);
    };

    mr.start(200); // collect every 200ms

    // RAF render loop
    const startTime = performance.now();
    const totalMs = TOTAL * 1000;

    function loop() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / 1000, TOTAL);
      drawFrame(t).then(() => {
        if (elapsed >= totalMs + 500) {
          mr.stop();
          source.stop();
          return;
        }
        requestAnimationFrame(loop);
      });
    }
    requestAnimationFrame(loop);
  }

  window._startCapture = startRecording;

  // Auto-start
  if (document.readyState === 'complete') setTimeout(startCapture, 300);
  else window.addEventListener('load', () => setTimeout(startCapture, 300));
})();
  `;

  // ── 3. 加载页面 ──
  await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const totalDur = await page.evaluate(() => window._totalDuration);
  const hasAudio = fs.existsSync(path.join(PROJECT_DIR, 'audio_full.wav'));
  console.log(`  总时长: ${totalDur}s | 音频: ${hasAudio}`);

  if (!hasAudio) {
    console.error('❌ audio_full.wav not found in project dir');
    await browser.close();
    process.exit(1);
  }

  // ── 4. 注入 audio path + capture script ──
  const injectData = {
    audioPath: path.join(PROJECT_DIR, 'audio_full.wav'),
    code: captureCode
  };
  await page.evaluate(data => {
    window._audioPath = data.audioPath;
    const el = document.createElement('script');
    el.textContent = data.code;
    document.body.appendChild(el);
  }, injectData);

  // ── 5. 等待录制完成 ──
  console.log('  🎙️  录制中...');
  const result = await page.evaluate(async () => {
    return new Promise(resolve => {
      const maxWait = 300000;
      const t0 = Date.now();
      const poll = () => {
        if (window._capturePath) resolve({ path: window._capturePath, error: null });
        else if (window._captureError) resolve({ path: null, error: window._captureError });
        else if (Date.now() - t0 > maxWait) resolve({ path: null, error: 'timeout after ' + maxWait + 'ms' });
        else setTimeout(poll, 500);
      };
      setTimeout(poll, 500);
    });
  });

  await browser.close();

  if (!result.path) {
    console.error('❌ 录制失败:', result.error);
    process.exit(1);
  }
  console.log('✅ 录制完成:', result.path);

  // ── 6. VideoToolbox GPU 转码 → MP4 ──
  const OUTPUT_MP4 = path.join(outDir, 'final.mp4');
  console.log('  🎬  转码中 (GPU VideoToolbox)...');
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-i', result.path,
    '-c:v', 'h264_videotoolbox',
    '-b:v', '10M',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    OUTPUT_MP4
  ]);
  ffmpeg.stderr.on('data', d => process.stderr.write(d));
  await new Promise(resolve => {
    ffmpeg.on('close', code => {
      if (code !== 0) { console.error('FFmpeg failed with code', code); process.exit(1); }
      const stats = fs.statSync(OUTPUT_MP4);
      console.log(`✅ 输出: ${OUTPUT_MP4} (${(stats.size/1024/1024).toFixed(2)} MB)`);
      resolve();
    });
  });
}

main().catch(e => { console.error(e); process.exit(1); });
