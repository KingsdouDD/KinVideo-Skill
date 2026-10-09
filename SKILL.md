
# KinVideo · 工作流导航

## 完整流程，严格遵守流程顺序，不可以跳跃

---

### Step 1 · 创建项目文件夹 + 写文案

- 动作：**必须**在 skill 目录下的 output 子目录里创建项目文件夹，后续所有文件统一存在这里
  ```bash
  mkdir -p ~/.openclaw/workspace/skills/kinvideo-tools/output/<项目名>
  ```
  - 示例：`~/.openclaw/workspace/skills/kinvideo-tools/output/ai-review-leak/`
  - **所有后续工具产出和生成文件全部存于此目录**
  - 后续所有路径引用都以这个目录为根目录

- 动作：写 `narration.txt`（存到 Step 1 创建的文件夹里）
- **必须使用 `\n\n\n\n`（4个换行符）代替所有标点符号**
  - `广州人把生活过成了一壶茶，早茶午茶夜茶。虾饺皮薄馅大。`
  - → `广州人把生活过成了一壶茶\n\n\n\n早茶午茶夜茶\n\n\n\n虾饺皮薄馅大\n\n\n\n`

#### 【铁律】写 narration.txt 必须走 exec，不能用 write/edit

`write`/`edit` 工具会把 `\n` 当字面字符串写入，导致断点工具解析失败，整段变成 1 句。

**Python 模板（推荐）：**
```python
content = """国庆假期想好去哪了吗

今天带你去三个地方

广州吃早茶看小蛮腰
"""
import re
content = re.sub(r'\n\n', '\n\n\n\n', content)
with open('narration.txt', 'w') as f:
    f.write(content)
```

---

### Step 2 · 合成 TTS（调工具）

- 调 `qwe3_tts` 工具，**把整个 narration.txt 一次性合成一段音频**
- **【铁律】禁止拆句逐条合成再拼接，必须一次性合成**

---

### Step 3 · 句子级断点定位（调工具）

- 调 `audio_sentence_breakpoints` 工具
- 输入：`audio_path`（audio_full.wav）+ `narration_path`
- 输出：`sentence_timings.json`（每句 start/end/text）
- **不动原音频、不插静音** — 纯分析

---

### Step 3.5 · 生成 Runtime 渲染架构（调工具）【关键步骤】

- 调 `runtime_html_hook` 工具
- 输入：`sentence_timings_path`（Step 3 产出）+ `output_dir`
- 输出：
  - `video-runtime.json` — Segment 时间/文本数据（Runtime 契约）
  - `runtime-core.js` — 时间控制基础设施（AI 禁止修改）
  - `index.html` — 固定 DOM 骨架 + N 个 Visual Slot（初版，slot 数量为 segment 数量）

---

### Step 3.6 · 合并 Visual Slot（按语义）【可选步骤】

> 当每句对应的画面元素太少、留白过多时，按语义将相邻多个 audio segment 合并为同一个 visual slot，画面在整段时间内保持稳定。

**前置条件：** Step 3.5 已生成 `video-runtime.json`

**操作方式：** 读 `video-runtime.json`，AI 自己判断相邻句子语义是否相近，将语义相近的若干相邻 segment 的 `visualSlot.containerSelector` 改为同一个 slot 名。

**示例（12 segment 合并为 4 个 visual slot）：**

```json
segments[0-2].visualSlot.containerSelector → "#slot-0"   // 语义相近：海面日出、朝阳升起、光线变化
segments[3-5].visualSlot.containerSelector → "#slot-1"   // 语义相近：天空渐变、云层流动
segments[6-8].visualSlot.containerSelector → "#slot-2"   // 语义相近：落日余晖、色彩绚烂
segments[9-11].visualSlot.containerSelector → "#slot-3"   // 语义相近：夜晚降临、收尾
```

**效果：**
- `_renderAt(t)` 在同一组 segment 的时间范围内始终返回同一个 slot，画面不切
- 字幕和音频仍按原句断点走（SUBTITLE_TIMINGS 不变）
- HTML 只需生成 4 个 slot，元素更丰富、留白更少

**步骤：**
1. 读 `video-runtime.json`，遍历所有 segment 的句子内容
2. AI 自行判断语义相近的相邻句，合并为若干个 visual slot（无绝对标准，模型凭语义判断）
3. 用 `edit` 工具修改 JSON 中对应 segment 的 `containerSelector` 值
4. 合并后 `requiredSelectors` 会自动缩减，HTML 骨架的 slot 数量相应减少

**注意：**
- 语义相近即内容相关性高，不是机械地每 N 句合并一次
- 如果判断所有句子语义都各不相同，则不合并，跳过此步骤
- 合并后需确认 `runtime-core.js` 和 `index.html` 的 slot 数量与合并后的 JSON 一致
- 只修改视频slot，音频的千万不要动
---

### Step 4a · 设计 HTML 骨架（无 CSS）【核心步骤】

> **【铁律】HTML 骨架 + CSS 类名设计完成后、写文件之前，先停下来问用户布局和排版，确认后再写文件。**

> **【铁律】必须先读 `video-runtime.json`，读了才能设计**
> - 每个 Slot 里的元素很少，先读一遍数据，设计时不用再读
> - **不写任何 CSS 样式**，只搭 HTML 结构
> - **暴露 CSS 类名接口**：给每个需要动画的元素起好类名
> - **预埋 CSS 文件引用**：假装 CSS 已存在，把路径写进 `<link>` 标签
> - **禁止在回复中输出 HTML**，用 `write` 工具一次性写完整文件

**步骤：**
1. 读取 `video-runtime.json`，理解每个 Segment 的时间范围和语音内容
2. 根据每句内容设计 HTML 结构（哪些元素、什么位置、什么层级）
3. 给需要动画的元素起好 CSS 类名（参考 css-atoms.md 命名惯例）
4. 在 `<head>` 里预埋 CSS 文件引用路径：
   ```html
   <link rel="stylesheet" href="visual.css" />
   ```
5. 用 `write` 工具一次性写完整 `index.html` 到 Step 3.5 生成的路径

**输出：**
- HTML 骨架文件（无内联样式）
- 类名清单（供 Step 4b 使用）

---

### Step 4b · 读 Visual Profile + 写 CSS【核心步骤】

**【铁律】按顺序读，不跳步，不自己发明排版**

1. 读 `visual-profiles/index.md`，判断内容类型，读取对应 profile MD
2. 按 profile MD 确定：字体 / 配色 / 排版骨架 / 动画原子 / easing 参数
3. 读 `kin-visual-index.md`，按索引行号读 `kin-visual.md` 中对应 CSS 原子
4. 读 Step 4a 的 `index.html`，列出所有暴露的类名
5. 按 profile 规范生成 `visual.css`，存到 Step 1 项目目录

Step 4a 预埋的 CSS 路径名，Step 4b 必须对应生成同名文件。

---

### Step 5 · 渲染 + 混音（调工具）

- 先调 `video_render`：传 `html_path` + `preset`
- 再调 `video_audio_mux`：传 `video_path` + `audio_path` + `preset`
- 输出：`final-<preset>.mp4`

---

## 三轴同步铁律

1. **画面跟嘴走**：`window._renderAt(t)` 返回的时间决定当前该显示哪个 Slot
2. **音频先于画面**：先合成音频 → 抽断点 → 生成架构 → 填视觉 → 渲染
3. **总时长 = 音频时长**：`window._totalDuration` = audio_full.wav 时长
4. **字幕、画面、语音共享同一时间轴**

---

## 工具清单

| 工具 | 用途 | 何时调 |
|------|------|------|
| `qwe3_tts` | TTS 语音合成 | Step 2 |
| `audio_sentence_breakpoints` | 找断点 | Step 3 |
| **`runtime_html_hook`** | **生成固定渲染架构（Segment/时间/Runtime 接口）** | **Step 3.7** |
| `video_render` | HTML → 视频 | Step 5 |
| `video_audio_mux` | 视频 + 音频合成 | Step 5 |
| `audio_silence_detect` | 静音段分析 | 排查用 |

---

## references/ 索引
