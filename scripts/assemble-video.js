#!/usr/bin/env node
/**
 * 一键生成视频：从 narration.txt → final.mp4
 *
 * 用法：node assemble-video.js <project_dir> [preset] [voice]
 *   project_dir: 视频项目目录（含 narration.txt 或 index.html）
 *   preset: vertical-9:16 | vertical-4:3 | horizontal-16:9 | horizontal-4:3 | square-1:1
 *   voice: TTS 音色 ID，默认 迪丽热巴_v2
 *
 * 工作流：
 *   1. 读 narration.txt（每行一句）
 *   2. 整段合成 TTS（qwe3_tts）
 *   3. 提取静音段（extract-silence.js）
 *   4. 字符比例兜底 → 每页时长表
 *   5. 注入到 HTML（auto-generate if not exist）
 *   6. 渲染视频（render.js）
 *   7. 拼音频（ffmpeg）
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const projectDir = process.argv[2] || process.cwd();
const preset = process.argv[3] || 'horizontal-16:9';
const voice = process.argv[4] || '迪丽热巴_v2';

if (!fs.existsSync(projectDir)) {
  console.error(`❌ 目录不存在: ${projectDir}`);
  process.exit(1);
}

const narrationFile = path.join(projectDir, 'narration.txt');
const htmlFile = path.join(projectDir, 'index.html');

if (!fs.existsSync(narrationFile) && !fs.existsSync(htmlFile)) {
  console.error(`❌ 需要 narration.txt 或 index.html`);
  console.error(`   在 ${projectDir} 创建 narration.txt，每行一句`);
  process.exit(1);
}

// 读取narration
let narration;
if (fs.existsSync(narrationFile)) {
  narration = fs.readFileSync(narrationFile, 'utf8')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  console.log(`📝 narration.txt: ${narration.length} 句`);
} else {
  // 已有 HTML 但没 narration，跳过音频步骤
  narration = [];
}

console.log(`🎯 配置: preset=${preset}, voice=${voice}`);

// === Step 1: TTS 整段合成 ===
async function synthesizeAudio() {
  if (narration.length === 0) {
    console.log('⏭️  跳过 TTS（无 narration.txt，使用外部音频）');
    return null;
  }
  console.log(`\n🎙️  Step 1 · 整段合成 TTS (${voice})...`);
  const fullText = narration.join('。');  // 中文用句号连接
  const audioPath = path.join(projectDir, 'audio_full.wav');

  // 调用 qwe3_tts 服务（http://127.0.0.1:18170）
  const resp = await fetch('http://127.0.0.1:18170/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: fullText, voice, language: 'Chinese' }),
  });
  if (!resp.ok) throw new Error(`TTS 服务失败: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(audioPath, buf);
  console.log(`   ✅ 音频已生成: ${audioPath} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
  return audioPath;
}

// === Step 2: 提取静音段 ===
function extractSilences(audioPath) {
  console.log(`\n🔇 Step 2 · 提取静音段...`);
  const script = path.join(__dirname, 'extract-silence.js');
  const out = execSync(
    `node "${script}" "${audioPath}" -30dB 0.4`,
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
  );
  // 提取 JSON 部分（最后是 stderr 统计）
  const jsonStart = out.indexOf('{');
  const jsonEnd = out.lastIndexOf('}') + 1;
  const result = JSON.parse(out.substring(jsonStart, jsonEnd));
  console.log(`   📊 总时长: ${result.total_duration}s · 静音: ${result.silence_count} 段`);
  return result;
}

// === Step 3: 计算每页时长 ===
function calcDurations(silenceResult, eyeBreathRule = 'auto') {
  console.log(`\n⏱️  Step 3 · 计算每页时长...`);
  const totalAudio = silenceResult.total_duration;
  const totalChars = narration.reduce((s, x) => s + x.length, 0);

  const durations = narration.map(s => {
    const audio = (s.length / totalChars) * totalAudio;
    const breath = s.length < 15 ? 1.0 : s.length < 25 ? 1.5 : 2.0;
    return +(audio + breath).toFixed(2);
  });

  const total = durations.reduce((a, b) => a + b, 0);
  console.log(`   📐 视频时长: ${total.toFixed(2)}s (音频 ${totalAudio}s + 缓冲 ${(total - totalAudio).toFixed(2)}s)`);
  return { durations, total };
}

// === Step 4: 写入 HTML（如果用模板） ===
function writeHtmlIfNeeded(durations, total) {
  if (fs.existsSync(htmlFile)) {
    console.log(`\n📄 Step 4 · 使用现有 HTML: ${htmlFile}`);
    return htmlFile;
  }
  console.log(`\n📝 Step 4 · 生成基础 HTML（未提供 index.html）...`);
  console.log(`   ⚠️  请用模板或手动编写 HTML`);
  return null;
}

// === Step 5: 渲染视频 ===
function renderVideo(htmlPath) {
  console.log(`\n🎬 Step 5 · 渲染视频 (${preset})...`);
  const renderScript = path.join(__dirname, 'render.js');
  execSync(
    `node "${renderScript}" "${htmlPath}" "${preset}"`,
    { stdio: 'inherit', cwd: projectDir }
  );
  return path.join(projectDir, 'video_raw.mp4');
}

// === Step 6: 拼音频 ===
function muxAudio(videoPath, audioPath) {
  console.log(`\n🔊 Step 6 · 拼音频...`);
  const videoDur = parseFloat(execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
    { encoding: 'utf8' }
  ).trim());

  // 视频时长通常 >= 音频时长，需要 apad 音频
  const paddedAudio = path.join(projectDir, 'audio_padded.wav');
  execSync(
    `ffmpeg -y -i "${audioPath}" -af "apad=whole_dur=${videoDur},atrim=0:${videoDur}" -ac 2 -ar 44100 "${paddedAudio}"`,
    { stdio: 'inherit' }
  );

  const finalPath = path.join(projectDir, `final-${preset}.mp4`);
  execSync(
    `ffmpeg -y -i "${videoPath}" -i "${paddedAudio}" -c:v copy -c:a aac -b:a 128k -shortest "${finalPath}"`,
    { stdio: 'inherit' }
  );
  console.log(`\n🎉 完成: ${finalPath}`);
  return finalPath;
}

// === Main ===
(async () => {
  try {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🚀 assemble-video · 自动化视频生成`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`📁 项目: ${projectDir}`);

    const audioPath = await synthesizeAudio();
    if (!audioPath) {
      console.log(`\n💡 跳过 TTS，直接渲染已有 HTML...`);
      renderVideo(htmlFile);
      return;
    }

    const silenceResult = extractSilences(audioPath);
    const { durations, total } = calcDurations(silenceResult);

    // 保存时长表供 HTML 引用
    fs.writeFileSync(
      path.join(projectDir, 'scene-durations.json'),
      JSON.stringify({
        strategy: 'B-extract-silence',
        total_audio: silenceResult.total_duration,
        total_video: total,
        real_silences: silenceResult.silence_count,
        durations,
        subtitles: narration,
      }, null, 2)
    );

    const htmlPath = writeHtmlIfNeeded(durations, total);
    if (!htmlPath) {
      console.log(`\n⏸️  请编写 index.html，durations 已保存到 scene-durations.json`);
      return;
    }

    const videoPath = renderVideo(htmlPath);
    muxAudio(videoPath, audioPath);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`✅ 全部完成！`);
    console.log(`${'═'.repeat(60)}`);
  } catch (err) {
    console.error(`\n❌ 错误: ${err.message}`);
    process.exit(1);
  }
})();