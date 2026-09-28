---
name: runtime-html-hook
description: |
  Runtime HTML Hook：Timeline → 动态 HTML Runtime 架构 → AI Visual Layer。
  读取 sentence_timings.json，生成 video-runtime.json（固定契约）和基础 HTML。
  Runtime 控制时间结构，AI 只填 Visual Slot。
---

# Runtime HTML Hook · Skill

> 唯一目标：**结构由 Runtime 控制，数量由 Runtime 控制，时间由 Runtime 控制。AI 只填视觉。**

---

## 架构边界

| 谁 | 控制什么 | 不能控制什么 |
|---|---------|-------------|
| **Runtime** | Segment 数量、时间范围、生命周期、渲染接口、DOM 结构 | 视觉内容 |
| **AI** | 视觉布局、动画、Typography、SVG、Canvas、MG、转场、配色 | Segment 结构、时间 |

---

## 核心文件

| 文件 | 职责 | AI 能改吗 |
|------|------|----------|
| `runtime-core.js` | 时间控制基础设施（固定） | ❌ 禁止 |
| `video-runtime.json` | Segment 数量/时间契约（只读） | ❌ 禁止 |
| `visual-design.js` | AI 视觉逻辑（自由） | ✅ 随意 |
| `index.html` | 最终 HTML | ✅ 只能改 Visual Slot 内部 |

---

## Pipeline（接入现有系统）

```
TTS 合成
    ↓
audio_sentence_breakpoints
    ↓
sentence_timings.json  ←─────────┐
    ↓                            │
Runtime HTML Hook ←───────────────┘
    ↓
video-runtime.json   (固定契约)
    ↓
assemble → index.html  (带 Visual Slots)
    ↓
AI Visual Designer  ← 读 video-runtime.json + taste-skill
    ↓
visual-design.js + 填充 Visual Slots
    ↓
Final HTML (runtime-core.js + visual-design.js)
    ↓
video_render → video_audio_mux → final.mp4
```

---

## 调用方式

### 命令行

```bash
# 基本用法：自动 segment 数 = 句子数
npx ts-node runtime-html-hook/index.ts \
  ./sentence_timings.json \
  ./output/myvideo

# 固定 segment 数（Runtime 强制）
npx ts-node runtime-html-hook/index.ts \
  ./sentence_timings.json \
  ./output/myvideo \
  --segment-count 5
```

### 作为工具调用

模型在 **Step 4 之前**（即写 HTML 之前）调此 Hook：

**输入：**
- `sentence_timings_path`：`sentence_timings.json` 路径
- `output_dir`：输出目录
- `segment_count`（可选）：固定 Segment 数量，不传则自动 = 句子数量

**输出：**
- `video-runtime.json`：固定契约（Segment 数量/时间由 Runtime 决定）
- `runtime-core.js`：时间控制基础设施
- `index.html`：带 Visual Slots 的基础 HTML

---

## video-runtime.json 结构

```json
{
  "version": "1.0",
  "generatedBy": "runtime-html-hook",
  "totalDuration": 45.2,
  "totalSegments": 5,
  "segments": [
    {
      "segmentIdx": 0,
      "start": 0.0,
      "end": 9.04,
      "durationSec": 9.04,
      "sentenceIdxRange": [0, 2],
      "sentences": [...],
      "chapter": "OPEN",
      "visualSlot": { "containerSelector": "#slot-0" }
    },
    ...
  ],
  "render": {
    "requiredSelectors": ["#stage", "#slot-0", "#slot-1", ...],
    "requiredGlobals": ["window._totalDuration", "window._currentTime", "window._renderFrame", "window._sceneTimings", "SUBTITLE_TIMINGS"],
    "runtimeContract": {
      "_totalDuration": "readonly",
      "_currentTime": "writable",
      "_renderFrame": "must_override",
      "_sceneTimings": "readonly",
      "SUBTITLE_TIMINGS": "readonly"
    }
  }
}
```

---

## AI Visual Designer 行为规范

### ✅ AI 可以做的

1. 在每个 `#slot-N` 内自由设计视觉内容（卡片、数字、SVG、Canvas、MG 动画等）
2. 覆盖/实现 `window._renderFrame(t)` 函数
3. 写 `visual-design.js`，在里面写所有视觉动画逻辑
4. 修改 `#stage` 的背景样式
5. 自由设计每个 Slot 的内部布局和动画

### ❌ AI 禁止做的

1. 修改 `#stage` 的 DOM 结构
2. 修改/删除 `[data-slot-idx]` 属性
3. 删除/修改 `runtime-core.js`
4. 手写 Segment 时间戳（`_sceneTimings` 里的 start/end 是 Runtime 算的，AI 只能读）
5. 删除/修改 `window._totalDuration`、`window._sceneTimings`、`SUBTITLE_TIMINGS`
6. 修改 `index.html` 中 Runtime 保留的部分（SLOTS 占位符、RUNTIME_CORE 占位符）

---

## 时间控制接口

Runtime 提供的确定性时间接口：

```javascript
// 读（AI 只能读）：
window._totalDuration        // 总时长（秒）
window._sceneTimings         // [{segmentIdx, start, end, durationSec, ...}, ...]
window.SUBTITLE_TIMINGS     // [{index, start, end, text}, ...]
window._renderAt(t)         // 返回 t 时刻的渲染状态（FFmpeg/Headless 兼容）

// 写（AI 需要覆盖）：
window._renderFrame(t)      // 主渲染回调，AI 必须实现

// DOM 属性（Runtime 自动维护，AI 只读）：
// [data-slot-idx="N"] 的 data-segment-start / data-segment-end / data-segment-dur
```

### `_renderAt(t)` 返回值（FFmpeg 兼容）

```javascript
{
  time: 4.5,              // 查询的时间点
  segmentIdx: 1,           // 当前 Segment index
  segmentStart: 3.0,       // Segment 开始时间
  segmentEnd: 6.5,         // Segment 结束时间
  segmentDur: 3.5,         // Segment 持续时长
  subtitleIdx: 2,          // 当前字幕 index
  subtitleText: "广州早茶", // 当前字幕文本
}
```

---

## Visual Slot 结构

```html
<!-- Runtime 生成（固定数量 = Segment 数）-->
<div id="slot-0" data-slot-idx="0"
     data-segment-start="0.000"
     data-segment-end="9.040"
     data-segment-dur="9.040"
     data-active="false">
  <!-- AI 在这里填视觉内容 -->
</div>

<div id="slot-1" data-slot-idx="1"
     data-segment-start="9.040"
     data-segment-end="18.120"
     data-segment-dur="9.080"
     data-active="false">
  <!-- AI 在这里填视觉内容 -->
</div>
```

### AI 的 `_renderFrame` 推荐实现

```javascript
// visual-design.js
window._renderFrame = function (t) {
  // 用 Runtime 的确定性时间 API
  const state = window._renderAt(t);

  // 1. 切换 Visual Slot 可见性（Runtime 硬约束：时间必须从 _renderAt 读）
  window._sceneTimings.forEach((seg, idx) => {
    const el = document.getElementById('slot-' + idx);
    if (!el) return;
    const isActive = t >= seg.start && t < seg.end;
    el.setAttribute('data-active', isActive ? 'true' : 'false');
    el.style.opacity = isActive ? '1' : '0';
  });

  // 2. AI 在这里写视觉动画（自由发挥）
  // 例如：数字动画、stagger reveal、SVG 路径动画等
  animateSlot(state.segmentIdx, t - seg.start);
};
```

---

## 错误示例

```javascript
// ❌ AI 自己算时间 → 一定错
const SCENES = [
  { id: 0, start: 0, end: 9.0 },   // 模型瞎写！
];

// ❌ AI 删除 Runtime 接口
delete window._sceneTimings;       // 禁止！
```

## 正确示例

```javascript
// ✅ AI 只读 _renderAt 或 _sceneTimings
const state = window._renderAt(t);
if (state.segmentIdx === 0) {
  // 播放 Segment 0 的动画
}
```
