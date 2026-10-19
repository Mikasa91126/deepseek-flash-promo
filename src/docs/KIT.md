# KIT —— 动效零件库 API（场景制作必读）

> 全片规范见根目录 `DESIGN.md`（分镜/色板/动效参数/上屏数字白名单）。
> 本文件是零件库速查。**制作场景时只允许改自己的 `src/scenes/SXX.tsx`，不得改零件库/theme/Root/index。**

## 0. 场景组件规范

```tsx
import { AbsoluteFill } from "remotion";
import { Stage } from "../comps/Stage";

/** S05 · 标题（21s–27s · 360f） */
export const S05 = ({ dur }: { dur: number }) => (
  <Stage dur={dur} tone="abyss" rays rayX={0.42} rayIntensity={0.13}>
    {/* 你的画面层 */}
  </Stage>
);
```

- 帧号：`useCurrentFrame()` 在本镜内从 0 起（SceneLab 与主片总装一致）。
- `dur` 是本镜总帧数 —— **一切时长节奏都以它/固定帧数为基准**（同一场景会在 60s 精剪版里以更短的 dur 复用，靠近结尾的动画请用 `dur - X` 表达）。
- 确定性铁律：禁止 `Math.random()` / `Date.now()`；随机用 `mulberry32(seed)`；粒子/抖动一律种子化。
- 所有进场：透明度先到（~12 帧 quad 由 FadeText 处理），位移后到（outExpo 0.6–0.9s）。
- 每镜结尾 8–14 帧做退场（淡出或位移）；跨色调切换（深海↔象牙白）用「缩至 0.98 淡出一帧空场」。
- 上屏文字必须来自 DESIGN.md §4 分镜表；数字必须来自 §6.1 白名单。

## 1. 粒子群引擎 `src/lib/swarm.ts`

```ts
import { CLOUDS, placeCloud, morph, drift, swim, transform, ring, line } from "../lib/swarm";

CLOUDS.whaleLg / whaleMd / whaleSm   // 官方鲸鱼 1500 / 480 / 150 点（俯视，头左下、尾右上）
CLOUDS.wordmark                      // DeepSeek 官方字标 1100 点
CLOUDS.tV41flash / t437 / t1m        // "V4.1 Flash" 950 点 / "437×" 700 点 / "1M" 520 点

placeCloud(cloud, targetW, cx, cy, rot?, flipX?)   // → Pt[] 已按宽缩放并居中
morph(from, to, p, seed?, arc?, stagger?)          // 群形态变换（from/to 长度需一致；p 配合 prog()）
drift(pts, frame, amp?, speed?)                    // 恒常微漂浮（呼吸感）
swim(pts, frame, { headX, toward?, len, amp, speed?, cycles? })  // 鲸摆尾游动形变
transform(pts, dx?, dy?, scale?)                   // 平移/以质心缩放
ring(n, cx, cy, r, phase?)                         // 圆环撒点
line(n, x1, y1, x2, y2)                           // 线段采样（粒子链）
```

常用组合（S2 粒子雨→鲸）：

```tsx
const rain = useMemo(() => placeCloud(CLOUDS.whaleLg, 900, 960, 430, 0, false).map(
  (p, i) => ({ x: (i * 137.5) % 1920, y: -((i * 73) % 1400) })), []);   // 起始态：竖落粒子雨
const target = useMemo(() => placeCloud(CLOUDS.whaleLg, 900, 960, 430), []);
const pts = morph(rain, target, prog(frame, 40, 150), 7, 90);
const alive = drift(swim(pts, frame - 150, { headX: 510, len: 900, amp: 26 }), frame, 4);
```

## 2. 渲染器 `src/comps/Swarm.tsx`

```tsx
<Swarm pts={pts} size={2.2} color={COLORS.mist} opacity={0.85} square blur={0} />
```

- `size/color/opacity` 支持按索引给函数：`(i) => 1.4 + (i % 3) * 0.6`
- `square`（默认 true）= 品牌方点语汇；`blur` 用于远景/发光柔化
- 一屏多层次粒子 = 叠多个 Swarm（不同 size/color/blur）

## 3. 氛围与特效 `src/comps/fx.tsx`

```tsx
<Grain opacity={0.05} />                       // 已在 Stage 内置，一般不用手加
<LightShaft x={0.5} intensity={0.14} tilt={6} />  // 光柱（径向渐变，无硬边）
<SonarRing cx={960} cy={540} start={220} dur={110} maxR={560} />
<Flash at={395} peak={0.6} rise={2} fall={6} />   // 白闪（全片仅睁眼/闪电可用）
<GlowOrb cx cy r intensity={0..1} />              // 辉光球（睁眼/水晶）
<Rule start={30} width={460} />                   // 品牌蓝发丝线（宽度展开）
```

## 4. 字幕与数字

```tsx
import { TYPO, CharReveal, FadeText } from "../comps/Text";
import { Counter } from "../comps/Counter";

<div style={{ ...TYPO.kickerCN }}>2024.12 · V3</div>
<CharReveal text="探索未至之境" start={20} style={{ ...TYPO.poem }} />   // 逐字垂直裁剪
<FadeText start={30} fadeOut={210}><div style={{ ...TYPO.sub }}>说明文字</div></FadeText>
<Counter from={0} to={389120} start={120} dur={84} style={{ ...TYPO.bigNum }} />
<SlideIn fromX={140} dur={26}>{/* 整层内容自右滑入（lateral slide） */}</SlideIn>
<RiseIn fromY={110}>{/* 自下而上（vertical rise；fromY 负值 = 自上方下落） */}</RiseIn>
```

排版纪律：数字全部等宽（TYPO 已带 tabular-nums）；sentence case；中文引语用「」。

## 5. 渲染自检命令（做完必须看静帧！）

```bash
cd B:/deepseek-flash-promo
npx remotion still SceneLab out/lab/S05-f060.png --frame=60  --props='{"scene":5}'
npx remotion still SceneLab out/lab/S05-f240.png --frame=240 --props='{"scene":5}'
```

渲染后用 Read 工具**亲眼看图**（构图/排版/可读性/色彩），不对就改，至少迭代 2 轮。帧建议：镜内 0.2s / 25% / 55% / 90% 四处。

## 6. 视觉纪律摘要（详见 DESIGN.md §2/§3）

- 色板只用 theme.ts 的 COLORS；品牌蓝 #4D6BFE 是全片唯一强调色
- 字体只用 FONTS 常量（思源宋体/黑体 + Montserrat/DM Sans/Fragment Mono），已自动加载
- camera creep / 暗角 / 颗粒已由 Stage 统一处理，勿重复叠加
- bloom/白闪全片仅一次量级 —— 属于 S11/S12，其他镜不得使用 Flash
