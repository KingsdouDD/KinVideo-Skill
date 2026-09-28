#!/usr/bin/env node
/**
 * 从 TTS 整段合成的音频中提取静音段，输出句间断点
 *
 * 用法：node extract-silence.js <audio.wav> [noise_db] [min_duration]
 *   noise_db: 静音阈值，默认 -30dB
 *   min_duration: 最短静音时长（秒），默认 0.4
 *
 * 输出 JSON 到 stdout：
 * {
 *   total_duration, silences[], boundaries[]
 * }
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');

const audioFile = process.argv[2];
const noiseDb = process.argv[3] || '-30dB';
const minDur = process.argv[4] || '0.2';

if (!audioFile) {
  console.error('用法：node extract-silence.js <audio.wav> [noise_db] [min_duration]');
  process.exit(1);
}
if (!fs.existsSync(audioFile)) {
  console.error(`找不到音频文件: ${audioFile}`);
  process.exit(1);
}

// 1. 获取总时长
function getDuration(file) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
    { encoding: 'utf8' }
  ).trim();
  return parseFloat(out);
}

// 2. 跑 silencedetect 提取静音段
function extractSilences(file, noise, minD) {
  const out = execSync(
    `ffmpeg -i "${file}" -af "silencedetect=noise=${noise}:d=${minD}" -f null - 2>&1`,
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
  );
  const silences = [];
  const starts = [];
  const lines = out.split('\n');
  for (const line of lines) {
    const startMatch = line.match(/silence_start:\s*([\d.]+)/);
    const endMatch = line.match(/silence_end:\s*([\d.]+)/);
    if (startMatch) starts.push(parseFloat(startMatch[1]));
    if (endMatch) {
      const end = parseFloat(endMatch[1]);
      const start = starts.shift();
      if (start !== undefined) {
        silences.push({
          start: +start.toFixed(3),
          end: +end.toFixed(3),
          duration: +(end - start).toFixed(3),
        });
      }
    }
  }
  return silences;
}

// 3. 计算断点（句间边界）
function calcBoundaries(silences, offset = 0.2) {
  const boundaries = [];
  for (const s of silences) {
    // 上一句结束 = 静音开始
    boundaries.push(+s.start.toFixed(3));
    // 下一句开始 = 静音结束 + 0.2s 缓冲
    boundaries.push(+(s.end + offset).toFixed(3));
  }
  return boundaries;
}

const total = getDuration(audioFile);
const silences = extractSilences(audioFile, noiseDb, minDur);
const boundaries = calcBoundaries(silences);

const result = {
  total_duration: +total.toFixed(3),
  audio_file: audioFile,
  noise_threshold: noiseDb,
  min_silence_duration: parseFloat(minDur),
  silence_count: silences.length,
  silences,
  boundaries,
};

console.log(JSON.stringify(result, null, 2));

// 简单统计
console.error(`\n📊 总时长: ${total.toFixed(2)}s`);
console.error(`🔇 静音段: ${silences.length} 段`);
console.error(`📍 边界点: ${boundaries.length} 个（每句 2 个）`);
if (silences.length > 0) {
  const avgSilence = silences.reduce((s, x) => s + x.duration, 0) / silences.length;
  console.error(`⏱️  平均静音时长: ${avgSilence.toFixed(2)}s`);
}