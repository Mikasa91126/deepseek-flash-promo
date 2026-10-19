/**
 * S05 · 2024.12·V3·巨鲸成形（21s–27s · 360f）
 * 七头小鲸（7 个聚集簇，落位与 S04 一致）向心汇聚成一头巨鲸（morph 120f）→ 摆尾游动
 * → 脊柱方向逐点点亮 14 枚小节点 → 底部三组数据逐项滚动落定。
 * 转场：竖向上升（translateY 90→0 · 26f）｜收尾 12f 淡出。
 * 节拍以 REF=360 为基准，k=dur/REF 缩放（60s 精剪版同组件复用）。
 */
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { Swarm } from "../comps/Swarm";
import { Counter } from "../comps/Counter";
import { FadeText, TYPO } from "../comps/Text";
import { COLORS, FONTS } from "../theme";
import { clamp01, mulberry32, outExpo, prog } from "../lib/anim";
import { CLOUDS, drift, morph, placeCloud, ring, swim } from "../lib/swarm";

const REF = 360;

/** 七个簇心（＝S04 七头小鲸的落位） */
const SEVEN = [
  { x: 500, y: 268, w: 150 },
  { x: 772, y: 214, w: 118 },
  { x: 648, y: 468, w: 132 },
  { x: 934, y: 330, w: 158 },
  { x: 1186, y: 228, w: 118 },
  { x: 1082, y: 520, w: 130 },
  { x: 1330, y: 402, w: 112 },
];

const WHALE_W = 820;
const WHALE_C = { x: 960, y: 455 };
/** 巨鲸首尾（由 placeCloud(whaleLg,1100,960,430) 实测点线性换算） */
const HEAD = {
  x: WHALE_C.x + (428 - 960) * (WHALE_W / 1100),
  y: WHALE_C.y + (522 - 430) * (WHALE_W / 1100),
};
const TAIL = {
  x: WHALE_C.x + (1506 - 960) * (WHALE_W / 1100),
  y: WHALE_C.y + (98 - 430) * (WHALE_W / 1100),
};
const SPINE_N = 14;

const NUM: CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: 44,
  letterSpacing: "0.02em",
  color: COLORS.ivory,
  fontVariantNumeric: "tabular-nums",
};
const UNIT: CSSProperties = {
  fontFamily: FONTS.sansCN,
  fontSize: 25,
  letterSpacing: "0.1em",
  color: "rgba(249,248,248,0.68)",
  marginLeft: 8,
};
const DOT: CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: 30,
  color: "rgba(156,193,231,0.45)",
  margin: "0 18px",
  alignSelf: "baseline",
};

export const S05 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;

  // 竖向上升入场
  const inP = outExpo(clamp01(frame / (26 * k)));
  const outP = clamp01((frame - (dur - 12 * k)) / (12 * k));

  // 七簇（起态）→ 巨鲸（终态）
  const start = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    const total = CLOUDS.whaleLg.pts.length; // 1500
    const wSum = SEVEN.reduce((a, b) => a + b.w, 0);
    let acc = 0;
    SEVEN.forEach((c, kk) => {
      const n =
        kk === SEVEN.length - 1 ? total - acc : Math.round((total * c.w) / wSum);
      acc += n;
      const cluster = ring(n, c.x, c.y, c.w * 0.2, kk * 0.9);
      const jr = mulberry32(700 + kk * 31);
      for (const p of cluster) {
        out.push({
          x: p.x + (jr() - 0.5) * 26,
          y: p.y + (jr() - 0.5) * 26,
        });
      }
    });
    return out;
  }, []);
  const target = useMemo(
    () => placeCloud(CLOUDS.whaleLg, WHALE_W, WHALE_C.x, WHALE_C.y),
    [],
  );

  // morph 内部已带 outExpo，这里用二次曲线把「汇聚」摊回到 120 帧的观感
  const convT = prog(frame, 6 * k, 120 * k);
  const convP = convT * convT;
  const tailAmp = 16 * clamp01(prog(frame, 122 * k, 44 * k));
  const pts = drift(
    swim(morph(start, target, convP, 7, 30, 0.3), frame, {
      headX: HEAD.x,
      toward: 1,
      len: WHALE_W * 0.98,
      amp: tailAmp,
      speed: 1,
    }),
    frame,
    3,
  );

  // 底部三组数据
  const nums = [
    { shown: "2048", suffix: "×H800", start: 172 },
    { shown: "55", suffix: "天", start: 196 },
    { shown: "557.6", suffix: "万美元", start: 220 },
  ];

  return (
    <Stage dur={dur} tone="abyss" rays rayX={0.5} rayIntensity={0.1}>
      <AbsoluteFill
        style={{
          opacity: clamp01(frame / (8 * k)) * (1 - outP),
          transform: `translateY(${(1 - inP) * 90}px)`,
        }}
      >
        {/* 巨鲸粒子 */}
        <Swarm
          pts={pts}
          size={2.4}
          opacity={0.92}
          color={(i) => (i % 17 === 0 ? COLORS.bright : COLORS.mist)}
        />
        {/* 远层辉光粒子（体积感） */}
        <Swarm
          pts={pts.filter((_, i) => i % 3 === 0)}
          size={4}
          opacity={0.07}
          blur={6}
          color={COLORS.brand}
        />

        {/* 脊柱节点（pow(i,0.8) 错落点亮） */}
        {Array.from({ length: SPINE_N }, (_, i) => {
          const t = 0.1 + (0.78 * i) / (SPINE_N - 1);
          const x = HEAD.x + (TAIL.x - HEAD.x) * t;
          const y = HEAD.y + (TAIL.y - HEAD.y) * t;
          const d = Math.pow(i, 0.8) * 2.7;
          const p = outExpo(prog(frame, (132 + d) * k, 16 * k));
          const glow = 1 - 0.55 * clamp01(prog(frame, (168 + d) * k, 50 * k));
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x - 2.5,
                top: y - 2.5,
                width: 5,
                height: 5,
                backgroundColor: COLORS.bright,
                opacity: p,
                boxShadow: `0 0 ${10 * glow}px rgba(103,153,254,${0.85 * glow})`,
              }}
            />
          );
        })}

        {/* 底部渐变（文案区衬底） */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 660,
            width: 1460,
            height: 420,
            background:
              "linear-gradient(180deg, rgba(10,10,10,0) 0%, rgba(10,10,10,0.55) 45%, rgba(10,10,10,0.88) 100%)",
          }}
        />

        {/* kicker（日期行） */}
        <FadeText
          start={34 * k}
          y={10}
          dur={40 * k}
          style={{ position: "absolute", left: 140, top: 110 }}
        >
          <div style={{ ...TYPO.kickerCN }}>2024.12 · V3 ｜ 671B MoE</div>
        </FadeText>

        {/* 主文案块（左下）：三组数据 + EN */}
        <div style={{ position: "absolute", left: 140, bottom: 160 }}>
          <FadeText start={168 * k} y={14} dur={48 * k}>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              {nums.map((n, i) => (
                <span
                  key={n.shown}
                  style={{ display: "flex", alignItems: "baseline" }}
                >
                  {i > 0 ? <span style={DOT}>·</span> : null}
                  <span style={NUM}>
                    <Counter
                      to={Number(n.shown)}
                      start={n.start * k}
                      dur={54 * k}
                      format={(v) =>
                        n.shown.includes(".")
                          ? v.toFixed(1)
                          : Math.round(v).toString()
                      }
                    />
                  </span>
                  <span style={UNIT}>{n.suffix}</span>
                </span>
              ))}
            </div>
            <div style={{ ...TYPO.en, fontSize: 24, marginTop: 20 }}>
              671B MoE, trained for $5.576M on 2048 H800s in 55 days.
            </div>
          </FadeText>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
