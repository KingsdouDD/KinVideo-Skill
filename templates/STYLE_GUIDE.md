# 23 模板风格指南

> 当用户说「套模板 / 用模板 / 选个风格」时，读本文件。
> 当用户说「自己设计 / 原创 / 特别做」时，读 `taste-skill/SKILL.md`。
>
> 选模板的核心判断：**文案在讲什么**，而不是「好不好看」。

---

## 快速匹配

| 文案主题 | 推荐模板 |
|---------|---------|
| 科技 / AI / Cyberpunk / 失控 / 警示 | `frame-glitch-title` |
| 情绪 / 诗歌 / 金句 / 仪式感开场 | `vfx-text-cursor` |
| 叙事 / 故事 / 章节 / 回忆感 | `frame-light-leak-cinema` |
| 数据 / 统计 / 指标 / KPI 揭示 | `frame-pentagram-stat` |
| 数据趋势 / 折线图 / 时间序列 | `frame-data-chart-nyt` / `frame-nyt-graph` |
| 品牌宣言 / 态度 / 社论 / 冲击力 | `frame-bold-poster` / `frame-kinetic-type` |
| 章节分隔 / 观点陈述 / 大编号 | `frame-bold-signal` |
| Pull-quote / 引言 / 对话感 | `frame-electric-studio` |
| 创意标题 / 活力感 / 复古现代 | `frame-creative-voltage` |
| 企业 / 报告 / 理性克制 | `frame-swiss-grid` / `frame-build-minimal` |
| 产品介绍 / 功能展示 | `frame-product-promo` |
| 品牌故事 / 完整叙事（30s） | `frame-product-promo-30s` |
| 概念图解 / 节点关系 / 技术可视化 | `frame-takram-organic` |
| 竖屏 Bold 声明 / 社交媒体 | `frame-vignelli` |
| 视频片尾 / 品牌闭幕 | `frame-logo-outro` |
| 轻松 / 趣味 / 创意广告 | `frame-play-mode` |
| 实时数据 / Dashboard 快照 | `frame-data-rollup` |
| 生活品牌 / 杂志风 / 暖调 | `frame-warm-grain` |
| 决策分析 / 逻辑分支 | `frame-decision-tree` |

---

## 模板详情

### frame-glitch-title
**故障艺术标题帧**
- 风格：cyan/magenta 像散偏移 + CRT 扫描线 + 数据腐败伪影 + 角落 ASCII 噪点
- 字体：粗体等宽风
- 适合：科技失控、AI 伦理、安全实验、警示标题
- 索引：`templates/frame-glitch-title/source/index.html`

### frame-liquid-bg-hero
**流体背景 Hero 帧**
- 风格：WebGL 多层 radial-gradient 呼吸背景 + 金句 overlay
- 适合：品牌宣言、诗歌感开场、情绪铺垫
- 索引：`templates/frame-liquid-bg-hero/source/index.html`

### frame-light-leak-cinema
**胶片漏光电影帧**
- 风格：暖橙漏光 + 35mm 颗粒 + 2.39:1 letterbox + 衬线大字 + 胶片齿孔
- 适合：叙事型内容、章节开场、回忆感、故事节奏
- 索引：`templates/frame-light-leak-cinema/source/index.html`

### frame-bold-poster
**大胆海报帧**
- 风格：1970s 欧洲社论风 + 番红强调色 + 巨型 Shrikhand 倾斜大字 + 三行标题逐行升起
- 适合：品牌宣言、社论开场、态度表达、冲击力
- 索引：`templates/frame-bold-poster/source/index.html`

### frame-bold-signal
**大胆信号卡帧**
- 风格：暗渐变底 + 大编号 + 橙色焦点卡滑入 + 标题升起
- 适合：章节分隔、观点陈述、高冲击力过渡
- 索引：`templates/frame-bold-signal/source/index.html`

### frame-electric-studio
**电光分屏帧**
- 风格：白/蓝双屏从中心开合 + 强调条生长 + 引言逐行浮现
- 适合：Pull-quote、使命陈述、高对比专业感
- 索引：`templates/frame-electric-studio/source/index.html`

### frame-creative-voltage
**创意电压分屏帧**
- 风格：电光蓝/暗错位分屏滑入 + 描边电光词 + 手写 script 自描
- 适合：创意品牌标题、活力感、复古现代混搭
- 索引：`templates/frame-creative-voltage/source/index.html`

### frame-kinetic-type
**动态字体帧**
- 风格：粗体动态排版 + 弹性动画 + 逐字揭示
- 适合：宣言标题、冲击力短句、节奏感强
- 索引：`templates/frame-kinetic-type/index.html`

### frame-play-mode
**弹性动画帧**
- 风格：弹跳缓动 + 活泼配色 + 弹性缩放
- 适合：轻松话题、趣味开场、创意广告、社交媒体
- 索引：`templates/frame-play-mode/index.html`

### frame-vignelli
**Vignelli 粗体竖屏帧**
- 风格：红 + 粗体衬线 + 9:16 竖屏 + Bold 声明
- 适合：竖屏社交媒体、观点卡片、冲击力竖屏内容
- 索引：`templates/frame-vignelli/index.html`

### frame-swiss-grid
**瑞士网格帧**
- 风格：严谨网格 + 极简衬线 + 克制排版 + 理性留白
- 适合：企业报告、数据展示、理性克制的正式内容
- 索引：`templates/frame-swiss-grid/index.html`

### frame-pentagram-stat
**瑞士数据帧**
- 风格：巨大红黑数字锚点 + 红色强调 + 生长条形图 + 黑色数据底栏
- 适合：单一关键指标（KPI）、新闻数据、权威揭示
- 索引：`templates/frame-pentagram-stat/source/index.html`

### frame-data-chart-nyt
**NYT 数据图表帧**
- 风格：NYT 新闻室排版 + 错峰揭示动画 + 编辑级折线/柱/范围带图
- 适合：数据叙事、趋势分析、新闻报道风格
- 索引：`templates/frame-data-chart-nyt/index.html`

### frame-nyt-graph
**NYT 折线图帧**
- 风格：报刊编辑风 + 时间轴折线动画 + mono 数字
- 适合：线性数据、历史趋势、统计叙事
- 索引：`templates/frame-nyt-graph/index.html`

### frame-data-rollup
**数据滚动帧**
- 风格：柱子从 0 长出（spring 动画）+ 数字同步 0→目标滚动
- 适合：实时数据、Dashboard 快照、KPI 动态揭示
- 索引：`templates/frame-data-rollup/source/index.html`

### frame-product-promo
**产品推广帧**
- 风格：Figma 风分屏 + Logo 组件切片 + 逐帧展示
- 适合：产品功能介绍、App 演示
- 索引：`templates/frame-product-promo/index.html`

### frame-product-promo-30s
**30 秒产品动画帧**
- 风格：8 场景完整叙事结构（问题→方案→品牌→优势→CTA）
- 适合：品牌故事、产品发布视频
- 索引：`templates/frame-product-promo-30s/index.html`

### frame-takram-organic
**东方柔和有机帧**
- 风格：米色底 + 毛玻璃圆角卡 + 曲线连接描入 + 放射节点弹出 + sage/terracotta 自然色
- 适合：技术概念图解、节点关系网络、温和叙事
- 索引：`templates/frame-takram-organic/source/index.html`

### frame-warm-grain
**暖调颗粒感帧**
- 风格：米黄底 + 胶片颗粒 + 暖橙光晕 + 杂志风排版
- 适合：生活品牌、产品发布、杂志风开场、手工感
- 索引：`templates/frame-warm-grain/index.html`

### frame-logo-outro
**Logo 收尾帧**
- 风格：Midnight Indigo + 分块 Logo 装配入场 + glow bloom + tagline 揭示
- 适合：视频片尾、品牌闭幕、End card
- 索引：`templates/frame-logo-outro/source/index.html`

### frame-build-minimal
**奢华极简留白帧**
- 风格：单词逐字浮现 + 暖金细线 + 70%+ 留白 + 呼吸细线指示器
- 适合：高端品牌、极简陈述、精致高端感
- 索引：`templates/frame-build-minimal/source/index.html`

### vfx-text-cursor
**VFX 光标逐字帧**
- 风格：光标拖光轨迹 + cyan/hot-pink 像散射线 + 定向光斑 + 逐字揭示
- 适合：金句开场、光效强调、仪式感、逐字揭示
- 索引：`templates/vfx-text-cursor/source/index.html`

### frame-decision-tree
**决策树帧**
- 风格：逻辑分支可视化 + 流程节点 + 条件连线
- 适合：决策分析、对比论证、逻辑推演
- 索引：`templates/frame-decision-tree/source/index.html`

---

## 套用流程

1. 根据文案主题，从上方「快速匹配」或「模板详情」选最合适的模板
2. 找到模板 `index.html` 路径（上方每个模板已注明）
3. 读取模板 HTML，把示例文字替换成当前 narration 内容
4. **保留模板的 CSS 动画、字体、配色方案**，只改文字内容
5. 按 workflow 走 Step 5 → Step 6

## 模板复用原则

- 模板的视觉风格（动画/Css/配色）**原样保留**，不修改
- 只替换 `<h1>` `<p>` `<span>` 等文字内容
- 如果模板结构不匹配 narration 数量（如模板 3 场景但 narration 10 句），按 `SENTENCE_TO_SCENE` 映射表复用场景
