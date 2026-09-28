# KinVideo-Skill

AI 视频生成工具集：TTS合成 → 音频断点定位 → Runtime HTML 生成 → 视觉设计 → 视频渲染 → 混音成片。

## 工具列表

| 工具 | 用途 |
|------|------|
| `audio_sentence_breakpoints` | 音频 + 文本 → 句子级断点 |
| `audio_silence_detect` | 音频 → 静音段聚类（调试用） |
| `video_render` | HTML → MP4（VideoToolbox/libx264） |
| `subtitle_inject` | 断点 JSON → 注入 HTML 字幕时间轴 |
| `scene_timing_inject` | 句子时间戳 → 按场景切分注入 HTML |
| `video_audio_mux` | 视频 + 音频 → 最终 MP4 |
| `tts_with_silence` | 程序性插入静音（不推荐用于断点） |
| `runtime_html_hook` | 生成视频渲染的固定 Runtime 架构 |

## 工作流

1. 写 `narration.txt`（`\n\n\n\n` 断句）
2. `qwe3_tts` 合成音频
3. `audio_sentence_breakpoints` 定位断点 → `sentence_timings.json`
4. `runtime_html_hook` 生成渲染架构
5. 设计 HTML + CSS
6. `video_render` → `video_audio_mux` → 成片

## 目录结构

```
tools/          — OpenClaw 工具注册源码
dist/           — 编译产物
runtime-html-hook/  — Runtime HTML 渲染架构生成器
scripts/        — 构建/测试脚本
templates/      — 视频视觉模板
references/     — 设计规范（kin-visual CSS 原子库）
```

## 依赖

- OpenClaw >= 2026.3.24-beta.2
- Node.js >= 18
- ffmpeg（系统路径）
- playwright
