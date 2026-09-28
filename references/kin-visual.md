# KIN VISUAL — Atomic Layout + Motion Library

> For: HTML → Video / Editorial / Fashion / MG / Product / Story
>
> 来源：原 `kin-visual.css`（1100+ 行，30 章节）
> 用法：**先读本文件 §0 索引 → 跳到指定行号区间 → 只读那一段**，不要通读全文

---

## §0 · 快速索引（按场景模板）

> 每个模板 = 一组「排版 + 动画 + 装饰」原子，行号对应下方章节

### Hero · 大标题 + 副标题
- 排版：`kv-layout-hero-split` / `kv-layout-hero-media` / `kv-type-display` / `kv-type-subtitle` / `kv-type-meta`
- 动画：`kv-fade-up` + `kv-text-rise` + `kv-image-drift`
- 代码区间：§4 行 150-180 / §5 行 380-410 / §10 行 520-535 / §13 行 620-650 / §14 行 685-705

### Magazine · 杂志风（不对等分栏）
- 排版：`kv-layout-hierarchy` / `kv-layout-magazine` / `kv-type-display-tight` / `kv-rule`
- 动画：`kv-reveal-up` + `kv-line-grow`
- 代码区间：§4 行 180-200 / §5 行 385-400 / §11 行 555-580 / §17 行 855-865

### Bento · 卡片网格
- 排版：`kv-grid-bento` / `kv-bento-wide` / `kv-bento-large` / `kv-bento-tall`
- 动画：`kv-scale-soft` + `kv-card-stack-in`
- 代码区间：§3 行 110-135 / §12 行 580-605 / §16 行 835-855

### Split · 分屏对比
- 排版：`kv-layout-split` / `kv-layout-split-30-70` 等 6 种比例 / `kv-mask-diagonal`
- 动画：`kv-reveal-left` + `kv-reveal-right` + `kv-wipe-*`
- 代码区间：§4 行 158-175 / §6 行 425-445 / §11 行 558-580 / §15 行 790-805

### Timeline · 时间线
- 排版：`kv-layout-timeline` / `kv-timeline` / `kv-timeline-item`
- 动画：`kv-stagger` + `kv-fade-up` + `kv-dot-pop`
- 代码区间：§4 行 235-255 / §20 行 920-935 / §10 行 525 / §17 行 870

### Data Story · 数据故事
- 排版：`kv-layout-data` / `kv-stat` / `kv-chart` / `kv-meter` / `kv-type-number`
- 动画：`kv-progress-reveal` + `kv-chart-grid`
- 代码区间：§4 行 260-275 / §5 行 408 / §25 行 990-1015 / §22 行 950-980

### Collage · 拼贴叠加
- 排版：`kv-layout-overlap` / `kv-overlap-main` / `kv-overlap-side-a/b` / `kv-collage`
- 动画：`kv-rotate-in` + `kv-swing-in`
- 代码区间：§4 行 200-220 / §12 行 590-610

### Cinematic · 电影感
- 排版：`kv-layout-media-text` / `kv-media` / `kv-vignette` / `kv-soft-mask`
- 动画：`kv-image-drift` + `kv-text-rise` + `kv-progress-pan`
- 代码区间：§4 行 220-235 / §6 行 420-450 / §14 行 690-715 / §22 行 965-985 / §30 行 1085-1100

### Outro · 片尾
- 排版：`kv-layout-footer` / `kv-footer-brand`
- 动画：`kv-text-rise` + `kv-fade` + `kv-orbit`
- 代码区间：§4 行 275-285 / §13 行 620-635 / §17 行 875-890

### Editorial Dense · 密集编辑
- 排版：`kv-grid-editorial` / `kv-col-*` / `kv-stack-*` / `kv-type-meta`
- 动画：`kv-stagger` + `kv-fade-up`
- 代码区间：§3 行 90-110 / §2 行 60-80 / §5 行 412 / §10 行 525 / §20 行 920-935

---

## §0.1 · 原子速查（按类型）

### 字号 §5 (行 380-415)
```
kv-type-display        clamp(3rem,8vw,9rem)     超大展示
kv-type-display-tight  clamp(3rem,7vw,8rem)     紧凑展示
kv-type-title          clamp(2.5rem,6vw,6rem)   大标题
kv-type-title-small    clamp(1.8rem,3.5vw,3.5rem) 小标题
kv-type-subtitle       clamp(2rem,4vw,4rem)     副标题
kv-type-body           clamp(1.5rem,2.5vw,2.5rem) 正文
kv-type-small          1rem                     辅助文字
kv-type-meta           0.88rem, letter-spacing  元信息
kv-type-number         clamp(2rem,4vw,4rem)      数字
```

### 布局 §4 (行 145-290)
```
kv-layout-hero / -split / -35-65 / -65-35 / -media
kv-layout-split / -30-70 / -35-65 / -40-60 / -60-40 / -65-35 / -70-30
kv-layout-asymmetric / -reverse
kv-layout-hierarchy / -wide
kv-layout-magazine / -reverse
kv-layout-overlap + kv-overlap-main/-side-a/-side-b/-center
kv-layout-collage
kv-layout-media-text
kv-layout-quote
kv-layout-timeline
kv-layout-data
kv-layout-footer
```

### 网格 §3 (行 90-140)
```
kv-grid-{2,3,4,5,6}            等宽网格
kv-grid-tight / -loose / -airy  间距变体
kv-grid-editorial              12 列编辑网格 + kv-col-1~12
kv-grid-bento                  Bento 网格 + kv-bento-*
kv-grid-masonry                瀑布流
```

### 媒体 §6 (行 420-455)
```
kv-media-{16x9,4x3,3x4,1x1,9x16,wide}    比例
kv-media-{contain,top,center,bottom,left,right}  对齐
kv-mask-{diagonal,diagonal-reverse,arch,circle,cut,slant}  形状遮罩
```

### 卡片 §7 (行 460-510)
```
kv-card / -pad / -pad-lg / -row / -feature / -floating
kv-card-index / -border / -soft / -round / -shadow
kv-stack-cards                  三张堆叠
kv-card-3d / kv-depth-{1,2,3}  3D 卡片
```

### 时序 §9 (行 500-525)
```
duration: xs/sm/md/lg/xl/2xl → 180/320/600/900/1400/2200ms
delay: 0/1/2/3/4/5/6/7 → 0/80/160/240/320/500/700/1000ms
distance: sm/md/lg/xl → 16/32/64/100px
ease: /-soft/-spring/-sharp
```

### 入场动画
- §10 Fade (行 520-545)：`kv-fade / -up / -down / -left / -right`
- §11 Reveal (行 555-595)：`kv-reveal-up / -down / -left / -right / -diagonal / -circle`
- §12 Scale/Rotate (行 605-635)：`kv-scale-in / -soft / kv-zoom-in / -out / kv-rotate-in / kv-swing-in / kv-flip-x / -y`

### 文字动效 §13 (行 645-685)
```
kv-text-rise / -pop / -blur / -expand / -squeeze / -skew
```

### 图片动效 §14 (行 695-725)
```
kv-image-zoom / -pan-left / -pan-right / -pan-up / -pan-down
kv-image-drift (循环) / kv-image-breathe (循环)
```

### Wipe §15 (行 795-810)：`kv-wipe-{right,left,up,down}`

### SVG / MG §17 (行 860-895)
```
kv-draw / kv-pulse / kv-breathe / kv-orbit
kv-line-grow / kv-dot-pop
```

### Glitch §18 (行 905-925)
```
kv-glitch / kv-scan
```

### Stagger §20 (行 935-955)
```
kv-stagger / -fast / -slow（自动给子元素分配 delay）
```

### 进度控制 §22 (行 965-990)
```
kv-progress-reveal / -reveal-up / -scale / -slide / -pan / -rotate
（运行时通过 --kv-progress 0→1 控制）
```

### 数据 §25 (行 1000-1030)
```
kv-chart / -grid / -line / kv-meter / kv-stat
```

### 装饰 §26 (行 1040-1070) + §30 (行 1080-1120)
```
kv-rule / -full / -grow
kv-vertical-label
kv-corner-mark / -tr / -br / -bl
kv-vignette / kv-soft-mask / kv-fade-edge
kv-radius-{sm,md,lg,xl,pill}
kv-hover-lift / kv-hover-image
kv-divider / kv-rhythm / -tight / -loose
```

---

## §0.2 · 视频场景配方（来自原 §29）

| 场景 | 组合 |
|------|------|
| Editorial Hero | `kv-layout-hero-split` + `kv-type-display` + `kv-media-3x4` + `kv-fade-up` + `kv-image-drift` |
| Fashion Magazine | `kv-layout-hierarchy` + `kv-type-display-tight` + `kv-grid-editorial` + `kv-col-*` + `kv-media-3x4` |
| Product Launch | `kv-layout-media-text` + `kv-media` + `kv-label` + `kv-reveal-up` + `kv-image-zoom` |
| Dense Editorial | `kv-grid-editorial` + `kv-col-*` + `kv-stack-*` + `kv-type-meta` |
| Bento | `kv-grid-bento` + `kv-bento-wide` + `kv-bento-third` + `kv-bento-tall` + `kv-scale-soft` |
| Collage | `kv-layout-overlap` + `kv-overlap-main` + `kv-overlap-side-a` + `kv-overlap-side-b` + `kv-rotate-in` |
| Data Story | `kv-layout-data` + `kv-stat` + `kv-chart` + `kv-progress-reveal` |
| Timeline | `kv-layout-timeline` + `kv-timeline` + `kv-timeline-item` + `kv-stagger` + `kv-fade-up` |
| Cinematic | `kv-media` + `kv-image-drift` + `kv-vignette` + `kv-text-rise` + `kv-progress-pan` |
| Video Segment | CSS 静态布局 + Runtime 写 `--kv-progress: 0→1` + `kv-progress-*` 类 |

---

# 主体内容（按章节查找）

---

## §00 — 设计 Token (CSS 行 1-50)

```css
:root{
  /* 间距 */
  --kv-g1:8px; --kv-g2:16px; --kv-g3:24px; --kv-g4:32px;
  --kv-g5:48px; --kv-g6:64px; --kv-g7:96px; --kv-g8:128px;
  --kv-g9:192px; --kv-g10:256px;

  /* 内边距 */
  --kv-p1:24px; --kv-p2:48px; --kv-p3:64px; --kv-p4:96px;
  --kv-p5:128px; --kv-p6:8vw;

  /* 容器 */
  --kv-content:min(1400px,82vw);
  --kv-readable:900px;

  /* 缓动 */
  --kv-ease:cubic-bezier(.22,1,.36,1);
  --kv-ease-soft:cubic-bezier(.16,1,.3,1);
  --kv-ease-spring:cubic-bezier(.34,1.35,.64,1);
  --kv-ease-sharp:cubic-bezier(.7,0,.3,1);
  --kv-ease-smooth:cubic-bezier(.25,.8,.25,1);

  /* 时长 / 延迟 / 距离 */
  --kv-duration:700ms;
  --kv-delay:0ms;
  --kv-distance:32px;
}
```

---

## §01 — Canvas / Containers

```css
.kv-page,.kv-canvas{
  width:100%;height:100%;position:relative;overflow:hidden;
}
.kv-container{width:var(--kv-content);margin-inline:auto}
.kv-readable{width:min(var(--kv-readable),100%)}
.kv-section{position:relative;padding-block:var(--kv-p5)}
.kv-section-tight{padding-block:var(--kv-p3)}
.kv-section-wide{padding-block:var(--kv-p6)}
.kv-screen{min-height:100vh}
.kv-full-height{min-height:100%}
.kv-full-bleed{width:100vw;margin-left:50%;transform:translateX(-50%)}

.kv-frame-16x9{aspect-ratio:16/9}
.kv-frame-3x4{aspect-ratio:3/4}
.kv-frame-9x16{aspect-ratio:9/16}
.kv-frame-4x3{aspect-ratio:4/3}
.kv-frame-1x1{aspect-ratio:1/1}

.kv-render-safe{contain:layout paint}
.kv-gpu{transform:translateZ(0);backface-visibility:hidden}
.kv-no-overflow{overflow:hidden}
.kv-no-select{user-select:none}
```

---

## §02 — Flow Atoms

```css
.kv-row{display:flex;align-items:center}
.kv-row-between{display:flex;align-items:center;justify-content:space-between}
.kv-row-start{display:flex;align-items:flex-start}
.kv-row-end{display:flex;align-items:flex-end}
.kv-column{display:flex;flex-direction:column}
.kv-center{display:grid;place-items:center}

.kv-stack-1{display:flex;flex-direction:column;gap:var(--kv-g1)}
.kv-stack-2{display:flex;flex-direction:column;gap:var(--kv-g2)}
.kv-stack-3{display:flex;flex-direction:column;gap:var(--kv-g3)}
.kv-stack-4{display:flex;flex-direction:column;gap:var(--kv-g4)}
.kv-stack-5{display:flex;flex-direction:column;gap:var(--kv-g5)}
.kv-stack-6{display:flex;flex-direction:column;gap:var(--kv-g6)}
.kv-stack-7{display:flex;flex-direction:column;gap:var(--kv-g7)}
.kv-stack-8{display:flex;flex-direction:column;gap:var(--kv-g8)}

.kv-space-1{padding:var(--kv-g1)}
.kv-space-2{padding:var(--kv-g2)}
.kv-space-3{padding:var(--kv-g3)}
.kv-space-4{padding:var(--kv-g4)}
.kv-space-5{padding:var(--kv-g5)}
.kv-space-6{padding:var(--kv-g6)}
.kv-space-7{padding:var(--kv-g7)}
.kv-space-8{padding:var(--kv-g8)}
```

---

## §03 — Grid System

```css
.kv-grid{display:grid;gap:var(--kv-g4)}
.kv-grid-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.kv-grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.kv-grid-4{grid-template-columns:repeat(4,minmax(0,1fr))}
.kv-grid-5{grid-template-columns:repeat(5,minmax(0,1fr))}
.kv-grid-6{grid-template-columns:repeat(6,minmax(0,1fr))}

.kv-grid-tight{gap:var(--kv-g2)}
.kv-grid-loose{gap:var(--kv-g7)}
.kv-grid-airy{gap:var(--kv-g9)}

.kv-grid-editorial{
  display:grid;
  grid-template-columns:repeat(12,minmax(0,1fr));
  gap:var(--kv-g5);
}
.kv-col-1{grid-column:span 1}.kv-col-2{grid-column:span 2}
.kv-col-3{grid-column:span 3}.kv-col-4{grid-column:span 4}
.kv-col-5{grid-column:span 5}.kv-col-6{grid-column:span 6}
.kv-col-7{grid-column:span 7}.kv-col-8{grid-column:span 8}
.kv-col-9{grid-column:span 9}.kv-col-10{grid-column:span 10}
.kv-col-11{grid-column:span 11}.kv-col-12{grid-column:span 12}

.kv-offset-1{margin-left:8.333%}
.kv-offset-2{margin-left:16.666%}
.kv-offset-3{margin-left:25%}
.kv-offset-4{margin-left:33.333%}

.kv-grid-bento{
  display:grid;
  grid-template-columns:repeat(12,minmax(0,1fr));
  grid-auto-rows:minmax(60px,auto);
  gap:var(--kv-g4);
}
.kv-bento-wide{grid-column:span 7}.kv-bento-large{grid-column:span 5}
.kv-bento-half{grid-column:span 6}.kv-bento-third{grid-column:span 4}
.kv-bento-small{grid-column:span 3}
.kv-bento-tall{grid-row:span 4}.kv-bento-2{grid-row:span 2}
.kv-bento-3{grid-row:span 3}.kv-bento-4{grid-row:span 4}

.kv-grid-masonry{columns:3;column-gap:var(--kv-g4)}
.kv-grid-masonry>*{break-inside:avoid;margin-bottom:var(--kv-g4)}
```

---

## §04 — Layout Compositions

### Hero

```css
.kv-layout-hero{
  min-height:100%;display:grid;align-items:center;position:relative;
}
.kv-layout-hero-split{
  min-height:100%;display:grid;grid-template-columns:1fr 1fr;
  align-items:center;gap:var(--kv-g8);
}
.kv-layout-hero-35-65{
  display:grid;grid-template-columns:35% 65%;align-items:center;gap:var(--kv-g7);
}
.kv-layout-hero-65-35{
  display:grid;grid-template-columns:65% 35%;align-items:center;gap:var(--kv-g7);
}
.kv-layout-hero-media{
  min-height:100%;display:grid;grid-template-columns:.72fr 1.28fr;
  align-items:center;gap:var(--kv-g7);
}
.kv-hero-content{position:relative;z-index:3;max-width:900px}
.kv-hero-title{max-width:12ch}.kv-hero-subtitle{max-width:60ch}
.kv-hero-media{position:relative;min-height:60vh;overflow:hidden}
```

### Split

```css
.kv-layout-split{
  display:grid;grid-template-columns:1fr 1fr;
  gap:var(--kv-g7);align-items:center;
}
.kv-layout-split-30-70{display:grid;grid-template-columns:30% 70%;gap:var(--kv-g6);align-items:center}
.kv-layout-split-35-65{display:grid;grid-template-columns:35% 65%;gap:var(--kv-g6);align-items:center}
.kv-layout-split-40-60{display:grid;grid-template-columns:40% 60%;gap:var(--kv-g6);align-items:center}
.kv-layout-split-60-40{display:grid;grid-template-columns:60% 40%;gap:var(--kv-g6);align-items:center}
.kv-layout-split-65-35{display:grid;grid-template-columns:65% 35%;gap:var(--kv-g6);align-items:center}
.kv-layout-split-70-30{display:grid;grid-template-columns:70% 30%;gap:var(--kv-g6);align-items:center}
.kv-layout-split-text{max-width:var(--kv-readable)}
.kv-layout-split-media{min-width:0;overflow:hidden}
```

### Asymmetric

```css
.kv-layout-asymmetric{
  display:grid;grid-template-columns:1.7fr 1fr .55fr;
  gap:var(--kv-g6);align-items:end;
}
.kv-layout-asymmetric-reverse{
  display:grid;grid-template-columns:.55fr 1fr 1.7fr;
  gap:var(--kv-g6);align-items:end;
}
```

### Hierarchy

```css
.kv-layout-hierarchy{
  display:grid;grid-template-columns:1.5fr .5fr;
  gap:var(--kv-g7);align-items:end;
}
.kv-layout-hierarchy-wide{
  display:grid;grid-template-columns:2fr 1fr;
  gap:var(--kv-g8);align-items:start;
}
```

### Magazine

```css
.kv-layout-magazine{
  display:grid;grid-template-columns:1.8fr .7fr;
  gap:var(--kv-g8);
}
.kv-layout-magazine-reverse{
  display:grid;grid-template-columns:.7fr 1.8fr;
  gap:var(--kv-g8);
}
.kv-magazine-lead{max-width:18ch}.kv-magazine-sidebar{align-self:end}
.kv-rule{border-top:1px solid currentColor;padding-top:var(--kv-g3)}
.kv-meta-row{display:flex;justify-content:space-between;gap:var(--kv-g4)}
```

### Overlap

```css
.kv-layout-overlap{position:relative;min-height:560px}
.kv-overlap-main{position:absolute;inset:5% 8% 5% 20%;z-index:1}
.kv-overlap-side{position:absolute;width:34%;z-index:2}
.kv-overlap-side-a{left:0;top:12%}.kv-overlap-side-b{right:0;bottom:8%}
.kv-overlap-center{position:absolute;z-index:4;left:50%;top:50%;transform:translate(-50%,-50%)}
.kv-collage{position:relative;min-height:620px}.kv-collage>*{position:absolute}
```

### Full image

```css
.kv-layout-media-text{position:relative;overflow:hidden;min-height:480px}
.kv-layout-media-text::after{
  content:"";position:absolute;inset:0;z-index:1;
  background:linear-gradient(to top,rgba(0,0,0,.55),transparent 65%);
  pointer-events:none;
}
.kv-media-text-content{
  position:absolute;z-index:3;inset:auto var(--kv-p4) var(--kv-p4);
  max-width:900px;
}
```

### Quote

```css
.kv-layout-quote{
  display:grid;grid-template-columns:.25fr 1fr;
  gap:var(--kv-g6);align-items:start;
}
.kv-quote{max-width:18ch;font-size:clamp(2rem,5vw,5rem);line-height:.98;letter-spacing:-.04em}
.kv-quote-mark{font-size:clamp(4rem,8vw,8rem);line-height:.6}
```

### Timeline

```css
.kv-layout-timeline{
  display:grid;grid-template-columns:.35fr 1fr;gap:var(--kv-g7);
}
.kv-timeline{position:relative;display:grid;gap:var(--kv-g7)}
.kv-timeline::before{
  content:"";position:absolute;left:7px;top:0;bottom:0;
  width:1px;background:currentColor;opacity:.25;
}
.kv-timeline-item{position:relative;padding-left:var(--kv-g7)}
.kv-timeline-item::before{
  content:"";position:absolute;left:0;top:.35em;
  width:15px;height:15px;border-radius:50%;background:currentColor;
}
```

### Data

```css
.kv-layout-data{
  display:grid;grid-template-columns:1.4fr repeat(3,1fr);
  gap:var(--kv-g6);align-items:end;
}
.kv-stat{display:flex;flex-direction:column;gap:var(--kv-g2)}
.kv-stat-value{
  font-size:clamp(2.5rem,5vw,5.5rem);
  line-height:.9;letter-spacing:-.05em;font-variant-numeric:tabular-nums;
}
.kv-stat-label{font-size:.8rem;letter-spacing:.08em;text-transform:uppercase}
```

### Index

```css
.kv-index{display:grid}
.kv-index-item{
  display:grid;grid-template-columns:56px 1fr auto;
  gap:var(--kv-g4);align-items:center;padding-block:var(--kv-g4);
  border-top:1px solid currentColor;
}
.kv-index-item:last-child{border-bottom:1px solid currentColor}
.kv-index-number{font-variant-numeric:tabular-nums;opacity:.55}
```

### Footer

```css
.kv-layout-footer{
  display:grid;grid-template-columns:1.5fr repeat(3,1fr);
  gap:var(--kv-g7);align-items:end;
}
.kv-footer-brand{font-size:clamp(2rem,5vw,5rem);line-height:.9;letter-spacing:-.05em}
.kv-footer-links{display:grid;gap:var(--kv-g2)}
```

---

## §05 — Typography Atoms

```css
.kv-type-display{
  font-size:clamp(3rem,8vw,9rem);line-height:.88;
  letter-spacing:-.05em;font-weight:700;
}
.kv-type-display-tight{
  font-size:clamp(3rem,7vw,8rem);line-height:.82;
  letter-spacing:-.065em;font-weight:700;
}
.kv-type-title{
  font-size:clamp(2.5rem,6vw,6rem);line-height:.94;letter-spacing:-.04em;
}
.kv-type-title-small{
  font-size:clamp(1.8rem,3.5vw,3.5rem);line-height:.98;letter-spacing:-.035em;
}
.kv-type-subtitle{font-size:clamp(2rem,4vw,4rem);line-height:1.05}
.kv-type-body{font-size:clamp(1.5rem,2.5vw,2.5rem);line-height:1.4}
.kv-type-small{font-size:1rem;line-height:1.4}
.kv-type-meta{
  font-size:.88rem;line-height:1.2;letter-spacing:.1em;text-transform:uppercase;
}
.kv-type-number{
  font-variant-numeric:tabular-nums;font-size:clamp(2rem,4vw,4rem);line-height:1;
}
.kv-type-outline{
  color:transparent;-webkit-text-stroke:1px currentColor;
}
.kv-type-balance{text-wrap:balance}
.kv-type-pretty{text-wrap:pretty}
```

---

## §06 — Media Atoms

```css
.kv-media{position:relative;overflow:hidden;isolation:isolate}
.kv-media img,.kv-media video{
  width:100%;height:100%;display:block;object-fit:cover;
}
.kv-media-16x9{aspect-ratio:16/9}.kv-media-4x3{aspect-ratio:4/3}
.kv-media-3x4{aspect-ratio:3/4}.kv-media-1x1{aspect-ratio:1/1}
.kv-media-9x16{aspect-ratio:9/16}.kv-media-wide{aspect-ratio:2.2/1}
.kv-media-contain img,.kv-media-contain video{object-fit:contain}
.kv-media-top img,.kv-media-top video{object-position:top}
.kv-media-center img,.kv-media-center video{object-position:center}
.kv-media-bottom img,.kv-media-bottom video{object-position:bottom}
.kv-media-left img,.kv-media-left video{object-position:left}
.kv-media-right img,.kv-media-right video{object-position:right}

/* masks */
.kv-mask-diagonal{clip-path:polygon(0 0,100% 0,85% 100%,0 100%)}
.kv-mask-diagonal-reverse{clip-path:polygon(15% 0,100% 0,100% 100%,0 100%)}
.kv-mask-arch{clip-path:inset(0 round 50% 50% 0 0)}
.kv-mask-circle{clip-path:circle(50% at 50% 50%)}
.kv-mask-cut{clip-path:polygon(0 0,92% 0,100% 15%,100% 100%,0 100%)}
.kv-mask-slant{clip-path:polygon(0 0,100% 8%,100% 92%,0 100%)}
```

---

## §07 — Card Atoms

```css
.kv-card{position:relative;min-width:0;overflow:hidden}
.kv-card-pad{padding:var(--kv-p3)}
.kv-card-pad-lg{padding:var(--kv-p5)}
.kv-card-row{display:grid;grid-template-columns:auto 1fr;gap:var(--kv-g4);align-items:center}
.kv-card-feature{min-height:360px;display:grid;align-content:end;padding:var(--kv-p4)}
.kv-card-floating{position:relative;z-index:3;margin:-15% 8% 0}
.kv-card-index{position:absolute;inset:var(--kv-p3) var(--kv-p3) auto auto;z-index:4}
.kv-card-border{border:1px solid currentColor}
.kv-card-soft{border-radius:24px}
.kv-card-round{border-radius:999px}
.kv-card-shadow{box-shadow:0 20px 60px rgba(0,0,0,.12)}

/* stacked */
.kv-stack-cards{position:relative;min-height:500px}
.kv-stack-cards>*{position:absolute;inset:0;margin:auto;width:70%;height:80%}
.kv-stack-cards>:nth-child(1){transform:translate(-16%,8%) rotate(-6deg)}
.kv-stack-cards>:nth-child(2){transform:translate(16%,8%) rotate(6deg)}
.kv-stack-cards>:nth-child(3){transform:translate(0,-2%);z-index:3}

/* 3D */
.kv-3d-scene{perspective:1200px}
.kv-card-3d{transform-style:preserve-3d;transition:transform 700ms var(--kv-ease)}
.kv-card-3d:hover{transform:rotateX(4deg) rotateY(-7deg) translateY(-8px)}
.kv-depth-1{transform:translateZ(20px)}.kv-depth-2{transform:translateZ(40px)}
.kv-depth-3{transform:translateZ(70px)}
```

---

## §08 — Absolute / Decorative Atoms

```css
.kv-absolute{position:absolute}.kv-inset{inset:0}
.kv-top-left{inset:var(--kv-p3) auto auto var(--kv-p3)}
.kv-top-right{inset:var(--kv-p3) var(--kv-p3) auto auto}
.kv-bottom-left{inset:auto auto var(--kv-p3) var(--kv-p3)}
.kv-bottom-right{inset:auto var(--kv-p3) var(--kv-p3) auto}
.kv-center-absolute{
  position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
}
.kv-grid-overlay{
  position:absolute;inset:0;pointer-events:none;opacity:.08;
  background:linear-gradient(to right,currentColor 1px,transparent 1px) 0 0/8.3333% 100%;
}
.kv-frame{position:relative}
.kv-frame::before{
  content:"";position:absolute;inset:0;border:1px solid currentColor;
  pointer-events:none;z-index:10;
}
.kv-label{
  position:absolute;z-index:5;padding:6px 10px;font-size:.7rem;
  line-height:1;letter-spacing:.08em;text-transform:uppercase;
}
.kv-label-tl{top:var(--kv-g3);left:var(--kv-g3)}
.kv-label-tr{top:var(--kv-g3);right:var(--kv-g3)}
.kv-label-bl{bottom:var(--kv-g3);left:var(--kv-g3)}
.kv-label-br{bottom:var(--kv-g3);right:var(--kv-g3)}
```

---

## §09 — Motion Timing Atoms

```css
.kv-duration-xs{--kv-duration:180ms}
.kv-duration-sm{--kv-duration:320ms}
.kv-duration-md{--kv-duration:600ms}
.kv-duration-lg{--kv-duration:900ms}
.kv-duration-xl{--kv-duration:1400ms}
.kv-duration-2xl{--kv-duration:2200ms}

.kv-delay-0{--kv-delay:0ms}.kv-delay-1{--kv-delay:80ms}
.kv-delay-2{--kv-delay:160ms}.kv-delay-3{--kv-delay:240ms}
.kv-delay-4{--kv-delay:320ms}.kv-delay-5{--kv-delay:500ms}
.kv-delay-6{--kv-delay:700ms}.kv-delay-7{--kv-delay:1000ms}

.kv-distance-sm{--kv-distance:16px}
.kv-distance-md{--kv-distance:32px}
.kv-distance-lg{--kv-distance:64px}
.kv-distance-xl{--kv-distance:100px}

.kv-ease{--kv-ease:cubic-bezier(.22,1,.36,1)}
.kv-ease-soft{--kv-ease:cubic-bezier(.16,1,.3,1)}
.kv-ease-spring{--kv-ease:cubic-bezier(.34,1.35,.64,1)}
.kv-ease-sharp{--kv-ease:cubic-bezier(.7,0,.3,1)}
```

---

## §10 — Basic Entrance Motion

```css
.kv-fade{animation:kv-fade var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-fade-up{animation:kv-fade-up var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-fade-down{animation:kv-fade-down var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-fade-left{animation:kv-fade-left var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-fade-right{animation:kv-fade-right var(--kv-duration) var(--kv-ease) var(--kv-delay) both}

@keyframes kv-fade{from{opacity:0}to{opacity:1}}
@keyframes kv-fade-up{from{opacity:0;transform:translate3d(0,var(--kv-distance),0)}to{opacity:1;transform:translate3d(0,0,0)}}
@keyframes kv-fade-down{from{opacity:0;transform:translate3d(0,calc(var(--kv-distance)*-1),0)}to{opacity:1;transform:translate3d(0,0,0)}}
@keyframes kv-fade-left{from{opacity:0;transform:translate3d(var(--kv-distance),0,0)}to{opacity:1;transform:translate3d(0,0,0)}}
@keyframes kv-fade-right{from{opacity:0;transform:translate3d(calc(var(--kv-distance)*-1),0,0)}to{opacity:1;transform:translate3d(0,0,0)}}
```

---

## §11 — Premium Reveals

```css
.kv-reveal-up{animation:kv-reveal-up var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-reveal-down{animation:kv-reveal-down var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-reveal-left{animation:kv-reveal-left var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-reveal-right{animation:kv-reveal-right var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-reveal-diagonal{animation:kv-reveal-diagonal var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-reveal-circle{animation:kv-reveal-circle var(--kv-duration) var(--kv-ease) var(--kv-delay) both}

@keyframes kv-reveal-up{
 from{clip-path:inset(100% 0 0 0);transform:translateY(8%)}
 to{clip-path:inset(0);transform:translateY(0)}
}
@keyframes kv-reveal-down{
 from{clip-path:inset(0 0 100% 0);transform:translateY(-8%)}
 to{clip-path:inset(0);transform:translateY(0)}
}
@keyframes kv-reveal-left{
 from{clip-path:inset(0 100% 0 0);transform:translateX(8%)}
 to{clip-path:inset(0);transform:translateX(0)}
}
@keyframes kv-reveal-right{
 from{clip-path:inset(0 0 0 100%);transform:translateX(-8%)}
 to{clip-path:inset(0);transform:translateX(0)}
}
@keyframes kv-reveal-diagonal{
 from{clip-path:polygon(0 0,0 0,0 100%,0 100%);transform:translate(20px,20px)}
 to{clip-path:polygon(0 0,100% 0,100% 100%,0 100%);transform:translate(0)}
}
@keyframes kv-reveal-circle{
 from{clip-path:circle(0% at 50% 50%);opacity:.2;transform:scale(.96)}
 to{clip-path:circle(100% at 50% 50%);opacity:1;transform:scale(1)}
}
```

---

## §12 — Scale / Depth / Rotation

```css
.kv-scale-in{animation:kv-scale-in var(--kv-duration) var(--kv-ease-spring) var(--kv-delay) both}
.kv-scale-soft{animation:kv-scale-soft var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-zoom-in{animation:kv-zoom-in var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-zoom-out{animation:kv-zoom-out var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-rotate-in{animation:kv-rotate-in var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-swing-in{animation:kv-swing-in var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-flip-x{animation:kv-flip-x var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-flip-y{animation:kv-flip-y var(--kv-duration) var(--kv-ease) var(--kv-delay) both}

@keyframes kv-scale-in{from{opacity:0;transform:scale(.72)}to{opacity:1;transform:scale(1)}}
@keyframes kv-scale-soft{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes kv-zoom-in{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
@keyframes kv-zoom-out{from{opacity:0;transform:scale(1.12)}to{opacity:1;transform:scale(1)}}
@keyframes kv-rotate-in{from{opacity:0;transform:rotate(-8deg) scale(.94)}to{opacity:1;transform:rotate(0) scale(1)}}
@keyframes kv-swing-in{from{opacity:0;transform:rotate(-12deg) translateY(30px);transform-origin:top left}to{opacity:1;transform:rotate(0) translateY(0);transform-origin:top left}}
@keyframes kv-flip-x{from{opacity:0;transform:perspective(900px) rotateX(-80deg)}to{opacity:1;transform:perspective(900px) rotateX(0)}}
@keyframes kv-flip-y{from{opacity:0;transform:perspective(900px) rotateY(-80deg)}to{opacity:1;transform:perspective(900px) rotateY(0)}}
```

---

## §13 — Kinetic Typography

```css
.kv-text-rise{animation:kv-text-rise var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-text-pop{animation:kv-text-pop var(--kv-duration) var(--kv-ease-spring) var(--kv-delay) both}
.kv-text-blur{animation:kv-text-blur var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-text-expand{animation:kv-text-expand var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-text-squeeze{animation:kv-text-squeeze var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-text-skew{animation:kv-text-skew var(--kv-duration) var(--kv-ease) var(--kv-delay) both}

@keyframes kv-text-rise{
 from{opacity:0;transform:translateY(100%);filter:blur(8px)}
 to{opacity:1;transform:translateY(0);filter:blur(0)}
}
@keyframes kv-text-pop{
 0%{opacity:0;transform:scale(.5)}70%{opacity:1;transform:scale(1.05)}100%{opacity:1;transform:scale(1)}
}
@keyframes kv-text-blur{
 from{opacity:0;filter:blur(18px);transform:translateY(12px)}
 to{opacity:1;filter:blur(0);transform:translateY(0)}
}
@keyframes kv-text-expand{
 from{opacity:0;letter-spacing:.4em}to{opacity:1;letter-spacing:normal}
}
@keyframes kv-text-squeeze{
 from{opacity:0;transform:scaleX(1.15);filter:blur(6px)}to{opacity:1;transform:scaleX(1);filter:blur(0)}
}
@keyframes kv-text-skew{
 from{opacity:0;transform:translateX(-30px) skewX(-12deg)}
 to{opacity:1;transform:translateX(0) skewX(0)}
}
```

---

## §14 — Image Cinematic Motion

```css
.kv-image-zoom{animation:kv-image-zoom var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-image-pan-left{animation:kv-image-pan-left var(--kv-duration) linear var(--kv-delay) both}
.kv-image-pan-right{animation:kv-image-pan-right var(--kv-duration) linear var(--kv-delay) both}
.kv-image-pan-up{animation:kv-image-pan-up var(--kv-duration) linear var(--kv-delay) both}
.kv-image-pan-down{animation:kv-image-pan-down var(--kv-duration) linear var(--kv-delay) both}
.kv-image-drift{animation:kv-image-drift 10s var(--kv-ease) infinite alternate}
.kv-image-breathe{animation:kv-image-breathe 8s ease-in-out infinite alternate}

@keyframes kv-image-zoom{from{opacity:.2;transform:scale(1.12)}to{opacity:1;transform:scale(1)}}
@keyframes kv-image-pan-left{from{transform:scale(1.08) translateX(4%)}to{transform:scale(1.08) translateX(-4%)}}
@keyframes kv-image-pan-right{from{transform:scale(1.08) translateX(-4%)}to{transform:scale(1.08) translateX(4%)}}
@keyframes kv-image-pan-up{from{transform:scale(1.08) translateY(4%)}to{transform:scale(1.08) translateY(-4%)}}
@keyframes kv-image-pan-down{from{transform:scale(1.08) translateY(-4%)}to{transform:scale(1.08) translateY(4%)}}
@keyframes kv-image-drift{from{transform:scale(1.04) translate3d(-2%,1%,0)}to{transform:scale(1.09) translate3d(2%,-1%,0)}}
@keyframes kv-image-breathe{from{transform:scale(1)}to{transform:scale(1.035)}}
```

---

## §15 — Mask / Wipe

```css
.kv-wipe-right{animation:kv-wipe-right var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-wipe-left{animation:kv-wipe-left var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-wipe-up{animation:kv-wipe-up var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
.kv-wipe-down{animation:kv-wipe-down var(--kv-duration) var(--kv-ease) var(--kv-delay) both}
@keyframes kv-wipe-right{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0)}}
@keyframes kv-wipe-left{from{clip-path:inset(0 0 0 100%)}to{clip-path:inset(0)}}
@keyframes kv-wipe-up{from{clip-path:inset(100% 0 0 0)}to{clip-path:inset(0)}}
@keyframes kv-wipe-down{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0)}}
```

---

## §16 — Premium Card Interactions

```css
.kv-card-lift{
  transition:transform 600ms var(--kv-ease),box-shadow 600ms var(--kv-ease);
}
.kv-card-lift:hover{transform:translateY(-8px) scale(1.01)}
.kv-card-float{animation:kv-card-float 4s ease-in-out infinite}
.kv-card-stack-in{animation:kv-card-stack-in var(--kv-duration) var(--kv-ease-spring) var(--kv-delay) both}
@keyframes kv-card-float{
  0%,100%{transform:translateY(0) rotate(0)}
  50%{transform:translateY(-8px) rotate(.5deg)}
}
@keyframes kv-card-stack-in{
 from{opacity:0;transform:translateY(30px) rotate(3deg) scale(.94)}
 to{opacity:1;transform:translateY(0) rotate(0) scale(1)}
}

/* Magnetic / tilt: JS writes variables */
.kv-magnetic{
 transform:translate3d(calc(var(--kv-mx,0)*1px),calc(var(--kv-my,0)*1px),0);
 transition:transform 180ms var(--kv-ease);
}
.kv-tilt{
 transform:perspective(900px)
 rotateX(calc(var(--kv-ty,0)*1deg))
 rotateY(calc(var(--kv-tx,0)*1deg));
 transition:transform 180ms var(--kv-ease);
}
```

---

## §17 — SVG / MG

```css
.kv-draw{
 stroke-dasharray:1000;stroke-dashoffset:1000;
 animation:kv-draw var(--kv-duration) var(--kv-ease) var(--kv-delay) forwards;
}
@keyframes kv-draw{to{stroke-dashoffset:0}}

.kv-pulse{animation:kv-pulse 1.8s ease-in-out infinite}
.kv-breathe{animation:kv-breathe 3s ease-in-out infinite}
.kv-orbit{animation:kv-orbit 6s linear infinite;transform-origin:center}
@keyframes kv-pulse{
 0%,100%{transform:scale(1);opacity:1}
 50%{transform:scale(1.08);opacity:.75}
}
@keyframes kv-breathe{
 0%,100%{transform:scale(1)}
 50%{transform:scale(1.035)}
}
@keyframes kv-orbit{to{transform:rotate(360deg)}}

/* line / accent */
.kv-line-grow{
 transform-origin:left center;
 animation:kv-line-grow var(--kv-duration) var(--kv-ease) var(--kv-delay) both;
}
@keyframes kv-line-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}

.kv-dot-pop{animation:kv-dot-pop var(--kv-duration) var(--kv-ease-spring) var(--kv-delay) both}
@keyframes kv-dot-pop{from{opacity:0;transform:scale(0)}to{opacity:1;transform:scale(1)}}
```

---

## §18 — Glitch / Scan / Digital

```css
.kv-glitch{animation:kv-glitch 1.2s steps(2,end) infinite}
@keyframes kv-glitch{
 0%,90%,100%{transform:translate(0);filter:none}
 92%{transform:translate(-3px,1px);filter:contrast(1.4)}
 94%{transform:translate(3px,-1px);filter:contrast(1.2)}
 96%{transform:translate(-1px,0)}
}
.kv-scan{position:relative;overflow:hidden}
.kv-scan::after{
 content:"";position:absolute;inset:-20% 0 auto;height:20%;
 background:linear-gradient(to bottom,transparent,rgba(255,255,255,.28),transparent);
 animation:kv-scan 2.8s linear infinite;pointer-events:none;
}
@keyframes kv-scan{from{transform:translateY(-100%)}to{transform:translateY(600%)}}
```

---

## §19 — Particle / Ambient

```css
.kv-particle{animation:kv-particle 2.8s var(--kv-ease) infinite alternate}
@keyframes kv-particle{
 from{transform:translate3d(0,0,0) scale(.8);opacity:.35}
 to{transform:translate3d(var(--kv-px,20px),var(--kv-py,-30px),0) scale(1.15);opacity:1}
}
.kv-drift{animation:kv-drift 12s ease-in-out infinite alternate}
.kv-float-slow{animation:kv-float-slow 7s ease-in-out infinite}
@keyframes kv-drift{
 from{transform:translate3d(-2%,1%,0) scale(1.02)}
 to{transform:translate3d(2%,-1%,0) scale(1.06)}
}
@keyframes kv-float-slow{
 0%,100%{transform:translateY(0)}
 50%{transform:translateY(-14px)}
}
```

---

## §20 — Stagger System

```css
.kv-stagger>*{
 animation-delay:calc(var(--kv-delay,0ms) + var(--kv-i,0)*80ms);
}
.kv-stagger-fast>*{animation-delay:calc(var(--kv-delay,0ms) + var(--kv-i,0)*45ms)}
.kv-stagger-slow>*{animation-delay:calc(var(--kv-delay,0ms) + var(--kv-i,0)*130ms)}
.kv-stagger>:nth-child(1){--kv-i:0}.kv-stagger>:nth-child(2){--kv-i:1}
.kv-stagger>:nth-child(3){--kv-i:2}.kv-stagger>:nth-child(4){--kv-i:3}
.kv-stagger>:nth-child(5){--kv-i:4}.kv-stagger>:nth-child(6){--kv-i:5}
.kv-stagger>:nth-child(7){--kv-i:6}.kv-stagger>:nth-child(8){--kv-i:7}
.kv-stagger>:nth-child(9){--kv-i:8}.kv-stagger>:nth-child(10){--kv-i:9}
.kv-stagger>:nth-child(11){--kv-i:10}.kv-stagger>:nth-child(12){--kv-i:11}
```

---

## §21 — Scroll-Driven

```css
@supports(animation-timeline:view()){
 .kv-scroll-reveal{
  animation:kv-scroll-reveal linear both;
  animation-timeline:view();
  animation-range:entry 0% cover 35%;
 }
 .kv-scroll-rise{
  animation:kv-scroll-rise linear both;
  animation-timeline:view();
  animation-range:entry 0% exit 100%;
 }
 .kv-scroll-parallax{
  animation:kv-scroll-parallax linear both;
  animation-timeline:view();
  animation-range:entry 0% exit 100%;
 }
 .kv-scroll-scale{
  animation:kv-scroll-scale linear both;
  animation-timeline:view();
  animation-range:entry 0% cover 60%;
 }
}
@keyframes kv-scroll-reveal{
 from{opacity:0;transform:translateY(60px)}
 to{opacity:1;transform:translateY(0)}
}
@keyframes kv-scroll-rise{
 from{transform:translateY(70px);opacity:.3}
 to{transform:translateY(-70px);opacity:1}
}
@keyframes kv-scroll-parallax{
 from{transform:translateY(80px)}
 to{transform:translateY(-80px)}
}
@keyframes kv-scroll-scale{
 from{transform:scale(.86);opacity:.2}
 to{transform:scale(1);opacity:1}
}
```

---

## §22 — Video Timeline / Progress

```css
.kv-progress-reveal{
 clip-path:inset(0 calc((1 - var(--kv-progress,0))*100%) 0 0);
}
.kv-progress-reveal-up{
 clip-path:inset(calc((1 - var(--kv-progress,0))*100%) 0 0 0);
}
.kv-progress-scale{
 transform:scale(calc(.9 + var(--kv-progress,0)*.1));
 opacity:var(--kv-progress,0);
}
.kv-progress-slide{
 transform:translate3d(0,calc((1 - var(--kv-progress,0))*40px),0);
 opacity:var(--kv-progress,0);
}
.kv-progress-pan{
 transform:scale(1.08) translate3d(
   calc((.5 - var(--kv-progress,.5))*8%),
   calc((.5 - var(--kv-progress,.5))*4%),0
 );
}
.kv-progress-rotate{
 transform:rotate(calc((1 - var(--kv-progress,0))*-8deg));
 opacity:calc(.2 + var(--kv-progress,0)*.8);
}
```

---

## §23 — Horizontal Story / Scene

```css
.kv-story{
 display:grid;
 grid-auto-flow:column;
 grid-auto-columns:minmax(75vw,1fr);
 gap:var(--kv-g8);
 overflow-x:auto;
 scroll-snap-type:x mandatory;
}
.kv-story>*{scroll-snap-align:center}

.kv-scene{
 position:relative;
 min-height:100%;
 display:grid;
 place-items:center;
}
.kv-scene-content{position:relative;z-index:4}
.kv-scene-bg{position:absolute;inset:0;z-index:0}
.kv-scene-mid{position:absolute;inset:0;z-index:1}
.kv-scene-fg{position:relative;z-index:5}
```

---

## §24 — Visual Depth Layers

```css
.kv-layer-back{position:absolute;inset:0;z-index:0}
.kv-layer-mid{position:absolute;inset:0;z-index:1}
.kv-layer-card{position:relative;z-index:3}
.kv-layer-front{position:relative;z-index:5}
.kv-layer-top{position:relative;z-index:10}

.kv-depth-far{transform:scale(1.08);filter:blur(.2px)}
.kv-depth-near{transform:scale(1.02)}
.kv-depth-shadow{filter:drop-shadow(0 24px 50px rgba(0,0,0,.16))}
```

---

## §25 — Data Visual

```css
.kv-chart{
 position:relative;min-height:220px;display:grid;align-items:end;
}
.kv-chart-grid{
 position:absolute;inset:0;
 background:linear-gradient(currentColor 1px,transparent 1px) 0 0/100% 25%;
 opacity:.1;
}
.kv-chart-line{
 position:absolute;inset:20% 0 10%;
 border-bottom:2px solid currentColor;transform:skewY(-4deg);
}
.kv-meter{
 position:relative;height:8px;overflow:hidden;
 background:currentColor;opacity:.18;
}
.kv-meter::after{
 content:"";position:absolute;inset:0 auto 0 0;width:var(--kv-value,50%);
 background:currentColor;opacity:1;
}
```

---

## §26 — Special Editorial Details

```css
.kv-rule-full{width:100%;height:1px;background:currentColor;opacity:.25}
.kv-rule-grow{
 width:100%;height:1px;background:currentColor;
 transform-origin:left;animation:kv-line-grow var(--kv-duration) var(--kv-ease) both;
}
.kv-vertical-label{
 writing-mode:vertical-rl;
 text-orientation:mixed;
 letter-spacing:.12em;
 text-transform:uppercase;
 font-size:.7rem;
}
.kv-corner-mark{
 position:absolute;width:12px;height:12px;
 border-top:1px solid currentColor;border-left:1px solid currentColor;
}
.kv-corner-mark-tr{right:0;top:0;transform:rotate(90deg)}
.kv-corner-mark-br{right:0;bottom:0;transform:rotate(180deg)}
.kv-corner-mark-bl{left:0;bottom:0;transform:rotate(-90deg)}
```

---

## §27 — Responsive

```css
@media(max-width:1000px){
 .kv-layout-hero-split,.kv-layout-hero-35-65,.kv-layout-hero-65-35,
 .kv-layout-hero-media,.kv-layout-split,.kv-layout-split-30-70,
 .kv-layout-split-35-65,.kv-layout-split-40-60,.kv-layout-split-60-40,
 .kv-layout-split-65-35,.kv-layout-split-70-30,.kv-layout-asymmetric,
 .kv-layout-asymmetric-reverse,.kv-layout-hierarchy,.kv-layout-hierarchy-wide,
 .kv-layout-magazine,.kv-layout-magazine-reverse,.kv-layout-timeline,
 .kv-layout-data,.kv-layout-footer{grid-template-columns:1fr}

 .kv-grid-4,.kv-grid-5,.kv-grid-6{grid-template-columns:repeat(2,minmax(0,1fr))}
 .kv-grid-masonry{columns:2}
 .kv-grid-editorial{grid-template-columns:repeat(6,minmax(0,1fr))}
 .kv-col-7,.kv-col-8,.kv-col-9,.kv-col-10,.kv-col-11,.kv-col-12{grid-column:span 6}
 .kv-offset-1,.kv-offset-2,.kv-offset-3,.kv-offset-4{margin-left:0}
}

@media(max-width:600px){
 .kv-grid-2,.kv-grid-3,.kv-grid-4,.kv-grid-5,.kv-grid-6{grid-template-columns:1fr}
 .kv-grid-masonry{columns:1}
 .kv-grid-editorial{grid-template-columns:1fr}
 .kv-grid-editorial>*{grid-column:auto!important}
 .kv-layout-overlap,.kv-collage{min-height:460px}
 .kv-layout-overlap .kv-overlap-main{inset:8% 5% 8% 12%}
 .kv-overlap-side{width:42%}
 .kv-stack-cards{min-height:400px}
 .kv-story{grid-auto-columns:88vw}
}
```

---

## §28 — Accessibility

```css
@media(prefers-reduced-motion:reduce){
 *,*::before,*::after{
   scroll-behavior:auto!important;
   transition-duration:1ms!important;
   animation-duration:1ms!important;
   animation-iteration-count:1!important;
 }
}
```

---

## §29 — Composition Recipes（参考配方）

```
Editorial Hero:
  kv-layout-hero-split + kv-type-display + kv-media-3x4
  + kv-fade-up + kv-image-drift

Fashion Magazine:
  kv-layout-hierarchy + kv-type-display-tight
  + kv-grid-editorial + kv-col-* + kv-media-3x4

Product Launch:
  kv-layout-media-text + kv-media + kv-label
  + kv-reveal-up + kv-image-zoom

Dense Editorial:
  kv-grid-editorial + kv-col-* + kv-stack-* + kv-type-meta

Bento:
  kv-grid-bento + kv-bento-wide + kv-bento-third
  + kv-bento-tall + kv-scale-soft

Collage:
  kv-layout-overlap + kv-overlap-main
  + kv-overlap-side-a + kv-overlap-side-b
  + kv-rotate-in

Data Story:
  kv-layout-data + kv-stat + kv-chart
  + kv-progress-reveal

Timeline:
  kv-layout-timeline + kv-timeline + kv-timeline-item
  + kv-stagger + kv-fade-up

Cinematic:
  kv-media + kv-image-drift + kv-vignette
  + kv-text-rise + kv-progress-pan

Video Segment:
  CSS layout is static.
  Runtime writes:
    --kv-progress: 0 → 1
  Then combine:
    kv-progress-reveal
    kv-progress-scale
    kv-progress-pan
```

---

## §30 — Convenience / Polish

```css
.kv-vignette{
 position:relative;overflow:hidden;
}
.kv-vignette::after{
 content:"";position:absolute;inset:0;pointer-events:none;
 background:radial-gradient(ellipse at center,transparent 45%,rgba(0,0,0,.28) 100%);
 z-index:2;
}
.kv-soft-mask{
 mask-image:linear-gradient(to bottom,transparent 0,#000 12%,#000 88%,transparent 100%);
}
.kv-fade-edge{
 mask-image:linear-gradient(to right,transparent,#000 10%,#000 90%,transparent);
}
.kv-border-light{border:1px solid color-mix(in srgb,currentColor 18%,transparent)}
.kv-radius-sm{border-radius:8px}.kv-radius-md{border-radius:16px}
.kv-radius-lg{border-radius:24px}.kv-radius-xl{border-radius:32px}
.kv-radius-pill{border-radius:999px}

/* Gentle hover — deliberately restrained */
.kv-hover-lift{
 transition:transform 500ms var(--kv-ease),filter 500ms var(--kv-ease);
}
.kv-hover-lift:hover{transform:translateY(-6px);filter:brightness(1.02)}
.kv-hover-image img{
 transition:transform 900ms var(--kv-ease);
}
.kv-hover-image:hover img{transform:scale(1.045)}

/* Editorial divider */
.kv-divider{
 display:flex;align-items:center;gap:var(--kv-g4);
}
.kv-divider::after{
 content:"";height:1px;flex:1;background:currentColor;opacity:.25;
}

/* Vertical rhythm */
.kv-rhythm > * + *{margin-top:var(--kv-g5)}
.kv-rhythm-tight > * + *{margin-top:var(--kv-g3)}
.kv-rhythm-loose > * + *{margin-top:var(--kv-g7)}
```