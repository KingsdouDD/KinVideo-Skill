
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
  - `index.html` — 固定 DOM 骨架 + N 个 Visual Slot

---

### Step 4a · 设计 HTML 骨架（无 CSS）【核心步骤】

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

### Step 4b · 设计 CSS 类和动画【核心步骤】

> **【铁律】必须按顺序读：配色规范 → CSS 原子库 → HTML 骨架**
> - 读配色规范确定颜色体系
> - 读审美技能，选需要的动画类型
   - 配色/字体/布局/动画铁律（必读）
   - **必须在设计 HTML 之前读完**
> - 再读 Step 4a 生成的 HTML（看有哪些类名），对应生成样式
> - **禁止在回复中输出 CSS**，用 `write` 工具一次性写完整 CSS 文件

**步骤：**
1. 读取 `kin-visual-index.md`（轻量索引，先读这个找行号）
2. 根据索引行号，用 `read(path="kin-visual.md", offset=X, limit=Y)` 读取对应的 CSS 原子库内容
3. 问用户需要什么配色和动画风格，确定用哪个场景模板（Hero / Magazine / Bento / Split / Timeline / Data / Cinematic 等）
4. 读取 Step 4a 生成的 `index.html`，列出所有暴露的类名
5. 根据类名生成 `visual.css`（或 `visual-style.css`），对应写样式 + 动画
6. 写好的 CSS 文件存到 Step 1 创建的项目目录里

**注意：**
- Step 4a 里预埋的 CSS 引用路径，Step 4b 必须对应生成同名文件
- 如果 Step 4a 预埋了 `<link rel="stylesheet" href="visual.css" />`，Step 4b 就生成 `visual.css`

---

### Step 4c · 渲染前验证 CSS 链接【必须检查】

> **【铁律】每次渲染之前必须验证，CSS 链接错误会导致所有文字挤在左上角、动画不生效**

**检查动作（exec）：**
```bash
grep -n "stylesheet\|visual.css\|visual-style.css" <项目目录>/index.html | head -5
```

**验证标准（同时满足才算通过）：**

1. `<link rel="stylesheet" href="visual.css" />`（或 `visual-style.css`）**必须出现在 `<head>` 标签内部**，不是在 slot 内容里
2. 链接路径与 Step 4b 实际生成的 CSS 文件名完全一致

**正确示例：**
```html
<head>
  <link rel="stylesheet" href="visual.css" />
  ...
</head>
```

**错误示例（CSS 跑进 HTML 内容里）：**
```html
<!-- 错误：link 标签出现在 body 里的 slot-content 中 -->
<div class="slot-content">
  <span class="c-tag">&lt;link</span>...href="visual.css".../>
</div>
```

**如果验证失败：手动修复 `<head>` 中的 CSS 链接，再继续。**

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
