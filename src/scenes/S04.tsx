/**
 * S04 · 2024·V2·一条鲶鱼（15s–21s · 360f）
 * 时间轴光轨整体左移 420px → 第二节点亮起 → 光点分裂成七头小鲸游散（每头落定一圈微光）
 * → 右侧 ¥1 / ¥2 等宽价格滚动落定 → 左下引语小字。
 * 转场：自右滑入（140→0 · 26f）｜收尾 12f 淡出。
 * 节拍以 REF=360 为基准，k=dur/REF 缩放（60s 精剪版同组件复用）。
 */
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { Swarm } from "../comps/Swarm";
import { Counter } from "../comps/Counter";
import { FadeText, TYPO } from "../comps/Text";
import { SonarRing } from "../comps/fx";
import { COLORS, FONTS } from "../theme";
import { clamp01, outExpo, prog } from "../lib/anim";
import { CLOUDS, drift, morph, placeCloud, swim } from "../lib/swarm";

const REF = 360;

const RAIL_Y = 640;
const NODE1_X = 560; // 上一镜的节点，本镜左移后停在 x=140（对齐文案左缘）
const NODE2_X = 980; // 左移 420 后落在 x=560
const SHIFT = -420;

/** 七头小鲸落位（与 S05 汇聚时的七个簇心一致） */
const SEVEN = [
  { x: 500, y: 268, w: 150 },
  { x: 772, y: 214, w: 118 },
  { x: 648, y: 468, w: 132 },
  { x: 934, y: 330, w: 158 },
  { x: 1186, y: 228, w: 118 },
  { x: 1082, y: 520, w: 130 },
  { x: 1330, y: 402, w: 112 },
];

const SPLIT_START = 64;
const SPLIT_STAGGER = 2.7; // ≈45ms
const SPLIT_DUR = 54;
const PRICE1 = 104;
const PRICE2 = 130;

const QUOTE: CSSProperties = {
  fontFamily: FONTS.sansCN,
  fontWeight: 400,
  fontSize: 27,
  letterSpacing: "0.02em",
  lineHeight: 1.6,
  color: "rgba(249,248,248,0.62)",
};
const EN: CSSProperties = {
  ...TYPO.en,
  fontSize: 21,
  marginTop: 12,
  color: "rgba(156,193,231,0.62)",
};

export const S04 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;

  const inP = outExpo(clamp01(frame / (26 * k)));
  const outP = clamp01((frame - (dur - 12 * k)) / (12 * k));

  // 时间轴光轨整体左移（outExpo · 60f）
  const shift = SHIFT * outExpo(prog(frame, 8 * k, 60 * k));
  const railOp = clamp01(prog(frame, 4 * k, 14 * k));

  // 第二节点：光轨到位前亮起
  const node2P = outExpo(prog(frame, 56 * k, 20 * k));
  const node1Op = 1 - 0.62 * clamp01(prog(frame, 62 * k, 40 * k));

  // 七头小鲸：自第二节点分裂游散
  const groups = useMemo(
    () =>
      SEVEN.map((pos, kk) => {
        const to = placeCloud(CLOUDS.whaleSm, pos.w, pos.x, pos.y);
        const from = to.map((_, i) => ({
          x: NODE2_X + ((((i * 2654435761) >>> 0) % 100) / 100 - 0.5) * 14,
          y: RAIL_Y + ((((i * 40503) >>> 0) % 100) / 100 - 0.5) * 14,
        }));
        return { kk, pos, to, from, seed: 404 + kk * 13 };
      }),
    [],
  );

  const all: { x: number; y: number }[] = [];
  for (const g of groups) {
    const p = outExpo(
      prog(frame, (SPLIT_START + g.kk * SPLIT_STAGGER) * k, SPLIT_DUR * k),
    );
    const mp = morph(g.from, g.to, p, g.seed, 42, 0.42);
    const sw = swim(mp, frame, {
      headX: g.pos.x - g.pos.w / 2,
      toward: 1,
      len: g.pos.w,
      amp: 7,
      speed: 0.8,
    });
    for (const q of sw) all.push(q);
  }
  const pts = drift(all, frame, 2.6);

  const prices = [
    { v: 1, start: PRICE1 },
    { v: 2, start: PRICE2 },
  ];

  return (
    <Stage dur={dur} tone="abyss" rays rayX={0.72} rayIntensity={0.08}>
      <AbsoluteFill
        style={{
          opacity: clamp01(frame / (8 * k)) * (1 - outP),
          transform: `translateX(${(1 - inP) * 140}px)`,
        }}
      >
        {/* 时间轴光轨（整体左移） */}
        <div style={{ position: "absolute", inset: 0, opacity: railOp }}>
          <div
            style={{
              position: "absolute",
              left: -220 + shift,
              top: RAIL_Y,
              width: 2360,
              height: 1,
              background:
                "linear-gradient(90deg, rgba(103,153,254,0) 0%, rgba(103,153,254,0.9) 13%, rgba(103,153,254,0.9) 84%, rgba(103,153,254,0) 100%)",
              boxShadow: "0 0 14px 1px rgba(103,153,254,0.32)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -220 + shift,
              top: RAIL_Y - 5,
              width: 2360,
              height: 5,
              opacity: 0.45,
              background:
                "repeating-linear-gradient(90deg, rgba(103,153,254,0.55) 0px, rgba(103,153,254,0.55) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 42px)",
              maskImage:
                "linear-gradient(90deg, rgba(0,0,0,0) 0%, #000 16%, #000 82%, rgba(0,0,0,0) 100%)",
              WebkitMaskImage:
                "linear-gradient(90deg, rgba(0,0,0,0) 0%, #000 16%, #000 82%, rgba(0,0,0,0) 100%)",
            }}
          />
        </div>

        {/* 上一镜节点（随光轨移到 x=140） */}
        <div
          style={{
            position: "absolute",
            left: NODE1_X + shift - 4,
            top: RAIL_Y - 4,
            width: 8,
            height: 8,
            backgroundColor: COLORS.mist,
            opacity: 0.5 * node1Op,
            boxShadow: "0 0 8px rgba(175,211,220,0.55)",
          }}
        />

        {/* 第二节点 */}
        <div
          style={{
            position: "absolute",
            left: NODE2_X + shift - 9,
            top: RAIL_Y - 9,
            width: 18,
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 2 + 5 * node2P,
              height: 2 + 5 * node2P,
              backgroundColor: COLORS.bright,
              boxShadow: `0 0 ${14 * node2P}px rgba(103,153,254,0.9)`,
            }}
          />
        </div>
        <SonarRing
          cx={NODE2_X + shift}
          cy={RAIL_Y}
          start={58 * k}
          dur={110 * k}
          maxR={300}
        />

        {/* 七头小鲸 + 各自落定微光 */}
        <Swarm
          pts={pts}
          size={2.1}
          opacity={0.9}
          color={(i) => (i % 13 === 0 ? COLORS.bright : COLORS.mist)}
        />
        {SEVEN.map((pos, kk) => (
          <SonarRing
            key={kk}
            cx={pos.x}
            cy={pos.y}
            start={(SPLIT_START + kk * SPLIT_STAGGER + 38) * k}
            dur={62 * k}
            maxR={pos.w * 0.78}
            color={kk % 2 === 0 ? COLORS.mist : COLORS.bright}
            thickness={1}
          />
        ))}

        {/* 右侧 ¥1 / ¥2 等宽价格 */}
        <FadeText
          start={(PRICE1 - 16) * k}
          y={12}
          dur={30 * k}
          style={{
            position: "absolute",
            left: 1430,
            top: 292,
            display: "flex",
            gap: 62,
          }}
        >
          {prices.map((p, i) => {
            const land = (p.start + 46) * k;
            const pop = clamp01(prog(frame, land, 10 * k));
            const tick = outExpo(prog(frame, land, 18 * k));
            return (
              <div key={i} style={{ width: 170, textAlign: "right" }}>
                <div style={{ transform: `translateY(${(1 - pop) * -5}px)` }}>
                  <Counter
                    from={p.v + 6}
                    to={p.v}
                    start={p.start * k}
                    dur={46 * k}
                    prefix="¥"
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 92,
                      lineHeight: 1,
                      letterSpacing: "0.01em",
                      color:
                        pop > 0.02 && pop < 0.999 ? COLORS.white : COLORS.brand,
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 16,
                    marginLeft: "auto",
                    width: 42 * tick,
                    height: 1,
                    backgroundColor: COLORS.bright,
                    opacity: 0.9,
                  }}
                />
              </div>
            );
          })}
        </FadeText>
        <FadeText
          start={176 * k}
          y={8}
          dur={40 * k}
          style={{ position: "absolute", left: 1430, top: 434, width: 402 }}
        >
          <div
            style={{
              fontFamily: FONTS.sansCN,
              fontSize: 22,
              letterSpacing: "0.18em",
              color: "rgba(249,248,248,0.55)",
              textAlign: "right",
            }}
          >
            每百万 tokens
          </div>
        </FadeText>

        {/* kicker（日期行） */}
        <FadeText
          start={40 * k}
          y={10}
          dur={40 * k}
          style={{ position: "absolute", left: 140, top: 110 }}
        >
          <div style={{ ...TYPO.kickerCN }}>2024 · V2</div>
        </FadeText>

        {/* 左下引语 */}
        <div
          style={{ position: "absolute", left: 140, bottom: 160, maxWidth: 1180 }}
        >
          <FadeText start={188 * k} y={16} dur={52 * k}>
            <div style={{ ...QUOTE }}>
              「我们不是有意成为一条鲶鱼，只是不小心成了一条鲶鱼。」——梁文锋
            </div>
            <div style={{ ...EN }}>
              {'V2 — ¥1 in, ¥2 out, per million tokens. "We didn\'t mean to be a catfish. We just became one." — Liang Wenfeng'}
            </div>
          </FadeText>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
