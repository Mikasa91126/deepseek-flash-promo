/**
 * S08 · 2025.12·四金（37s–42s · 300f）
 * 四枚粒子金牌自顶部落下排成一行（IMO · CMO · ICPC · IOI），逐枚延迟 24f，
 * 每枚落定一圈微光 + 1–2 帧抖动；全部落定后整行静止 → 1px 基线与文案浮现。
 * 转场：自右滑入（140→0 · 26f）｜收尾 12f 淡出。
 * 节拍以 REF=300 为基准，k=dur/REF 缩放（60s 精剪版同组件复用）。
 */
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { Swarm } from "../comps/Swarm";
import { FadeText, TYPO } from "../comps/Text";
import { GlowOrb, SonarRing } from "../comps/fx";
import { COLORS, FONTS } from "../theme";
import { clamp01, mulberry32, outExpo, prog } from "../lib/anim";
import { ring } from "../lib/swarm";

const REF = 300;

const DROP_START = 20;
const DROP_DUR = 46;
const DROP_GAP = 24; // ≈0.4s（对应四声 chime）
const LAND_Y = 470;
const RAIL_Y = 620;

/** 四枚金牌：粒子圆盘（小簇点云）+ 标签 */
const MEDALS = [
  { label: "IMO", x: 420 },
  { label: "CMO", x: 780 },
  { label: "ICPC", x: 1140 },
  { label: "IOI", x: 1500 },
];

/** 每枚的粒子盘：三圈 + 中心点（确定性） */
const MEDAL_PTS = (() => {
  const out: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  const r1 = mulberry32(88);
  for (const p of ring(8, 0, 0, 13, 0.4)) out.push(p);
  for (const p of ring(16, 0, 0, 27, 0.1)) out.push(p);
  for (const p of ring(22, 0, 0, 41, 0.7)) out.push(p);
  return out.map((p) => ({ x: p.x + (r1() - 0.5) * 3, y: p.y + (r1() - 0.5) * 3 }));
})();

const CN: CSSProperties = {
  fontFamily: FONTS.serifCN,
  fontWeight: 300,
  fontSize: 50,
  letterSpacing: "0.1em",
  lineHeight: 1.5,
  color: COLORS.ivory,
};

export const S08 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;

  const inP = outExpo(clamp01(frame / (26 * k)));
  const outP = clamp01((frame - (dur - 12 * k)) / (12 * k));

  const landFrame = (i: number) => (DROP_START + i * DROP_GAP + DROP_DUR) * k;

  /** 四枚落点（含落定后 1–2 帧确定性抖动） */
  const rows = useMemo(
    () =>
      MEDALS.map((m, i) => {
        const r = mulberry32(808 + i * 17);
        return { ...m, i, jx: (r() - 0.5) * 11, jy: (r() - 0.5) * 11 };
      }),
    [],
  );

  const laid = rows.map((m) => {
    const st = (DROP_START + m.i * DROP_GAP) * k;
    const fall = outExpo(clamp01((frame - st) / (DROP_DUR * k)));
    const y = -80 + (LAND_Y + 80) * fall;
    const shakeOn = frame >= landFrame(m.i) ? 1 : 0;
    const shakeP = 1 - clamp01(prog(frame, landFrame(m.i), 2.2 * k));
    return {
      ...m,
      x: m.x + m.jx * shakeOn * shakeP,
      y: y + m.jy * shakeOn * shakeP,
    };
  });

  const pts = laid.flatMap((m) =>
    MEDAL_PTS.map((p) => ({ x: m.x + p.x, y: m.y + p.y })),
  );

  const railP = outExpo(prog(frame, 146 * k, 40 * k));

  return (
    <Stage dur={dur} tone="abyss" rays rayX={0.5} rayIntensity={0.08}>
      <AbsoluteFill
        style={{
          opacity: clamp01(frame / (8 * k)) * (1 - outP),
          transform: `translateX(${(1 - inP) * 140}px)`,
        }}
      >
        {/* 金牌粒子 */}
        <Swarm
          pts={pts}
          size={(i) => 1.5 + ((i % 3) as number) * 0.6}
          opacity={0.95}
          color={(i) =>
            i % 7 === 0 ? COLORS.ivory : i % 2 === 0 ? COLORS.brand : COLORS.bright
          }
        />

        {/* 每枚：底盘辉光 + 1px 金环 + 落定微光 */}
        {laid.map((m) => {
          const ringP = outExpo(prog(frame, landFrame(m.i), 16 * k));
          const glow =
            0.32 * clamp01(prog(frame, (DROP_START + m.i * DROP_GAP) * k, 16 * k)) +
            0.62 * (1 - clamp01(prog(frame, landFrame(m.i), 34 * k)));
          return (
            <div key={m.label}>
              <GlowOrb
                cx={m.x}
                cy={m.y}
                r={40}
                intensity={glow * 0.5}
                core={false}
              />
              <div
                style={{
                  position: "absolute",
                  left: m.x - 62,
                  top: m.y - 62,
                  width: 124,
                  height: 124,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 50% 42%, rgba(77,107,254,0.26), rgba(77,107,254,0.05) 72%)",
                  opacity: ringP,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: m.x - 62,
                  top: m.y - 62,
                  width: 124,
                  height: 124,
                  borderRadius: "50%",
                  border: "1px solid rgba(249,248,248,0.34)",
                  transform: `scale(${0.86 + 0.14 * ringP})`,
                  opacity: ringP,
                  boxShadow: "0 0 26px rgba(77,107,254,0.35) inset",
                }}
              />
              <SonarRing
                cx={m.x}
                cy={m.y}
                start={landFrame(m.i)}
                dur={56 * k}
                maxR={116}
                thickness={1}
                color={COLORS.bright}
              />
            </div>
          );
        })}

        {/* 1px 基线 */}
        <div
          style={{
            position: "absolute",
            left: 340,
            top: RAIL_Y,
            width: 1240 * railP,
            height: 1,
            background:
              "linear-gradient(90deg, rgba(103,153,254,0) 0%, rgba(103,153,254,0.75) 8%, rgba(103,153,254,0.75) 92%, rgba(103,153,254,0) 100%)",
          }}
        />

        {/* 四枚标签 */}
        {rows.map((m) => (
          <FadeText
            key={m.label}
            start={landFrame(m.i) + 6 * k}
            y={10}
            dur={34 * k}
            style={{
              position: "absolute",
              left: m.x - 120,
              top: LAND_Y + 92,
              width: 240,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 27,
                letterSpacing: "0.34em",
                color: COLORS.ice,
                textAlign: "center",
              }}
            >
              {m.label}
            </div>
          </FadeText>
        ))}

        {/* kicker（日期行） */}
        <FadeText
          start={34 * k}
          y={10}
          dur={40 * k}
          style={{ position: "absolute", left: 140, top: 110 }}
        >
          <div style={{ ...TYPO.kickerCN }}>2025.12 · V3.2-Speciale</div>
        </FadeText>

        {/* 主文案块（左下） */}
        <div style={{ position: "absolute", left: 140, bottom: 160 }}>
          <FadeText start={196 * k} y={16} dur={52 * k}>
            <div style={{ ...CN }}>四枚金牌</div>
            <div style={{ ...TYPO.en, fontSize: 24, marginTop: 14 }}>
              Four golds: IMO, CMO, ICPC, IOI.
            </div>
          </FadeText>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
