# KIN VISUAL — 索引（轻量版）

> ⚠️ 这只是**行号地图**，完整 CSS 在 `kin-visual.md`
>
> ## 用法
> 1. 只读本文件（≈3KB）→ 找到目标章节的行号
> 2. 用 `read(path="kin-visual.md", offset=X, limit=Y)` 读那一段
> 3. **绝对不要**直接 `read("kin-visual.md")` 通读全文（42KB）

---

## §0 · 场景模板（视频直接套）

| 场景 | 排版 (§4) | 字号 (§5) | 动画 (§10-15) | MD 行号 |
|------|----------|----------|--------------|---------|
| **Hero 大标题** | `kv-layout-hero-split` / `-media` | `kv-type-display` / `-subtitle` / `-meta` | `kv-fade-up` + `kv-text-rise` + `kv-image-drift` | `read kin-visual.md offset=350 limit=185` |
| **Magazine 杂志** | `kv-layout-hierarchy` / `-magazine` | `kv-type-display-tight` | `kv-reveal-up` + `kv-line-grow` | `read kin-visual.md offset=350 limit=185` |
| **Bento 网格** | `kv-grid-bento` + `kv-bento-*` | — | `kv-scale-soft` + `kv-card-stack-in` | `read kin-visual.md offset=301 limit=50` + `offset=839 limit=35` |
| **Split 分屏** | `kv-layout-split` / `-30-70` ~ `-70-30` | — | `kv-reveal-left` + `kv-reveal-right` + `kv-wipe-*` | `read kin-visual.md offset=350 limit=185` + `offset=824 limit=20` |
| **Timeline** | `kv-layout-timeline` + `kv-timeline-item` | — | `kv-stagger` + `kv-fade-up` + `kv-dot-pop` | `read kin-visual.md offset=350 limit=185` + `offset=950 limit=20` + `offset=907 limit=20` |
| **Data 数据** | `kv-layout-data` + `kv-stat` + `kv-chart` | `kv-type-number` | `kv-progress-reveal` | `read kin-visual.md offset=350 limit=185` + `offset=1087 limit=30` + `offset=1013 limit=35` |
| **Collage 拼贴** | `kv-layout-overlap` + `kv-overlap-*` | — | `kv-rotate-in` + `kv-swing-in` | `read kin-visual.md offset=350 limit=185` + `offset=743 limit=30` |
| **Cinematic 电影** | `kv-layout-media-text` + `kv-media` + `kv-vignette` | — | `kv-image-drift` + `kv-text-rise` + `kv-progress-pan` | `read kin-visual.md offset=350 limit=185` + `offset=595 limit=35` + `offset=802 limit=25` + `offset=1013 limit=35` |
| **Outro 片尾** | `kv-layout-footer` + `kv-footer-brand` | — | `kv-text-rise` + `kv-orbit` | `read kin-visual.md offset=350 limit=185` + `offset=767 limit=40` + `offset=872 limit=35` |
| **Editorial Dense** | `kv-grid-editorial` + `kv-col-1~12` + `kv-stack-*` | `kv-type-meta` / `kv-type-body` | `kv-stagger` + `kv-fade-up` | `read kin-visual.md offset=301 limit=50` + `offset=270 limit=35` + `offset=532 limit=40` + `offset=950 limit=20` |

---

## §0.1 · 原子速查（按类型，单点查询）

| 类型 | 内容 | MD 行号 |
|------|------|---------|
| **字号 §5** | display / title / subtitle / body / small / meta / number | `read kin-visual.md offset=532 limit=40` |
| **布局 §4** | hero / split / asymmetric / hierarchy / magazine / overlap / media-text / quote / timeline / data / footer | `read kin-visual.md offset=350 limit=185` |
| **网格 §3** | kv-grid-{2~6} / editorial 12列 / bento / masonry | `read kin-visual.md offset=301 limit=50` |
| **媒体 §6** | kv-media-{比例} / kv-mask-{形状} | `read kin-visual.md offset=567 limit=30` |
| **卡片 §7** | kv-card-* / kv-stack-cards / kv-card-3d / kv-depth-* | `read kin-visual.md offset=595 limit=35` |
| **时序 §9** | duration / delay / distance / ease 变量 | `read kin-visual.md offset=659 limit=30` |
| **入场 §10** | kv-fade / -up / -down / -left / -right | `read kin-visual.md offset=687 limit=20` |
| **Reveal §11** | kv-reveal-up / -down / -left / -right / -diagonal / -circle | `read kin-visual.md offset=705 limit=40` |
| **缩放旋转 §12** | kv-scale-* / kv-zoom-* / kv-rotate-in / kv-swing-in / kv-flip-* | `read kin-visual.md offset=743 limit=30` |
| **文字动效 §13** | kv-text-rise / -pop / -blur / -expand / -squeeze / -skew | `read kin-visual.md offset=767 limit=40` |
| **图片动效 §14** | kv-image-zoom / -pan-* / -drift(循环) / -breathe(循环) | `read kin-visual.md offset=802 limit=25` |
| **Wipe §15** | kv-wipe-right / -left / -up / -down | `read kin-visual.md offset=824 limit=20` |
| **SVG/MG §17** | kv-draw / kv-pulse / kv-breathe / kv-orbit / kv-line-grow / kv-dot-pop | `read kin-visual.md offset=872 limit=35` |
| **Glitch §18** | kv-glitch / kv-scan | `read kin-visual.md offset=907 limit=20` |
| **Stagger §20** | kv-stagger / -fast / -slow（自动给子元素分配 delay） | `read kin-visual.md offset=950 limit=20` |
| **进度控制 §22** | kv-progress-reveal / -scale / -slide / -pan / -rotate（运行时 --kv-progress 0→1） | `read kin-visual.md offset=1013 limit=35` |
| **数据 §25** | kv-chart / -grid / -line / kv-meter | `read kin-visual.md offset=1087 limit=30` |
| **装饰 §26** | kv-rule / -vertical-label / kv-corner-mark / kv-radius-* | `read kin-visual.md offset=1114 limit=30` |
| **杂项 §30** | kv-vignette / kv-soft-mask / kv-fade-edge / kv-hover-lift / kv-divider / kv-rhythm | `read kin-visual.md offset=1240 limit=45` |

---

## §0.2 · 视频场景配方（来自 §29）

`read kin-visual.md offset=1189 limit=55`

---

## §0.3 · 设计 Token（间距/缓动/时长变量）

`read kin-visual.md offset=208 limit=35`

---

## 命名规范

- `kv-` = 根前缀
- `kv-layout-*` = 布局组合
- `kv-grid-*` = 网格系统
- `kv-media-*` = 媒体容器
- `kv-type-*` = 字号
- `kv-card-*` = 卡片
- `kv-motion-*` = 动效
- `kv-reveal-*` = 入场遮罩
- `kv-scroll-*` = 滚动驱动
- `kv-progress-*` = 视频时间轴驱动
- `kv-fade / -up / -down / -left / -right` = 基础入场
- `kv-stagger` = 批量延迟

---

## CSS 变量覆盖技巧

```css
/* 在父元素上覆盖，子元素继承 */
.kv-fade-up.kv-duration-lg { --kv-duration: 900ms; --kv-delay: 200ms; }
```

---

## ⚡ 性能

- 视频渲染时**只保留 transform / opacity / clip-path** 相关动画
- 避免 box-shadow 动画（重排）
- 用 `kv-gpu` / `kv-will-change` 标记 GPU 加速