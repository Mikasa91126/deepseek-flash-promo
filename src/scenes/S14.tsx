/**
 * S14 · 1M 上下文·数字落定（1:13–1:18 · 300f）
 *
 * 洋面扩展：小小一洼（300px）扩展成整片海洋（1920+）；「1M」粒子字自洋面升起、
 * 稳定在中央偏上；右侧 Terminal-Bench 2.1 对照条形图自右入场（90.6 vs 87.9，
 * 宽比即数值比），末段标注渐显。
 *
 * 转场：竖向上升（RiseIn）；结尾 14f 缩至 0.98 淡出（接 S15 跨色调 settle）。
 * 节奏：镜内一切节拍以 90s 基准（REF）书写，按 k = dur / REF 缩放（60s 精剪复用）。
 */
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { Swarm } from "../comps/Swarm";
import { FadeText, TYPO } from "../comps/Text";
import { CLOUDS, drift, morph, placeCloud, type Pt } from "../lib/swarm";
import { COLORS, FONTS } from "../theme";
import { clamp01, mulberry32, outExpo, prog } from "../lib/anim";

const REF = 300;

const SURF_Y = 700;
const BAR_X = 1200;
const BAR_MAX = 420;
const TB_A = 90.6;
const TB_B = 87.9;

/* ------------------------------------------------------------ 条形图一条 */

const Bar = ({
  y,
  value,
  max,
  color,
  startBeat,
  f,
}: {
  y: number;
  value: number;
  max: number;
  color: string;
  /** 节拍帧（90s 基准） */
  startBeat: number;
  /** 节拍帧（90s 基准）当前值 */
  f: number;
}) => {
  const target = (value / max) * BAR_MAX;
  const grow = outExpo(clamp01((f - startBeat) / 46));
  return (
    <div
      style={{
        position: "absolute",
        left: BAR_X,
        top: y,
        height: 26,
        width: target * grow,
        borderRadius: 3,
        backgroundColor: color,
        opacity: clamp01((f - startBeat) / 12),
      }}
    />
  );
};

/* ---------------------------------------------------------------- S14 */

export const S14 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;
  /** 节拍帧：90s 基准时间轴（物理微动效仍用真实 frame，不缩放） */
  const f = frame / k;

  /* 转场：竖向上升入场；结尾 14f（基准）缩至 0.98 淡出 */
  const riseY = (1 - outExpo(clamp01(f / 28))) * 64;
  const exitP = clamp01((f - (REF - 14)) / 14);
  const op = clamp01(f / 12) * (1 - exitP);
  const exitScale = 1 - 0.02 * exitP;

  /* 洋面：300 → 2020（从小水洼扩成整片海洋，smoothstep 让「水洼阶段」看得见） */
  const poolT = clamp01((f - 26) / 112);
  const poolP = poolT * poolT * (3 - 2 * poolT);
  const poolW = 300 + 1720 * poolP;

  /* 「1M」粒子字：自洋面升起并稳定 */
  const surf = useMemo(
    () =>
      Array.from({ length: CLOUDS.t1m.pts.length }, (_, i) => ({
        x: 620 + (i % 44) * 13.6,
        y: SURF_Y - 6 + Math.floor(i / 44) * 1.5,
      })) as Pt[],
    [],
  );
  const target = useMemo(() => placeCloud(CLOUDS.t1m, 560, 800, 400), []);
  const oneM = useMemo(
    () => drift(morph(surf, target, prog(f, 70, 105), 5, 44), frame, 2.4, 0.6),
    [surf, target, frame, f],
  );
  const oneMOp = clamp01((f - 84) / 24);

  /* 洋面波光点：随洋面扩张依次被「点亮」 */
  const sparkles = useMemo(() => {
    const r = mulberry32(1010);
    return Array.from({ length: 44 }, (_, i) => ({
      x: -120 + r() * 2160,
      y: (i % 4) * 2.2,
      ph: r() * Math.PI * 2,
      size: 1.4 + (i % 3) * 0.7,
      sp: 0.25 + r() * 0.5,
    }));
  }, []);

  const cnStyle = {
    fontFamily: FONTS.serifCN,
    fontWeight: 300,
    fontSize: 36,
    letterSpacing: "0.03em",
    lineHeight: 1.55,
    color: COLORS.ivory,
  } as const;

  return (
    <Stage dur={dur} tone="abyss">
      <AbsoluteFill
        style={{
          opacity: op,
          transform: `translateY(${riseY}px) scale(${exitScale})`,
        }}
      >
        {/* ---------- 洋面：水体 ---------- */}
        <div
          style={{
            position: "absolute",
            left: 960 - poolW / 2,
            top: SURF_Y,
            width: poolW,
            height: 1080 - SURF_Y,
            background:
              "linear-gradient(180deg, rgba(19,38,59,0.95) 0%, rgba(19,38,59,0.5) 32%, rgba(10,10,10,0.88) 100%)",
            WebkitMaskImage:
              "linear-gradient(90deg, rgba(0,0,0,0) 0px, #000 48px, #000 calc(100% - 48px), rgba(0,0,0,0) 100%)",
            maskImage:
              "linear-gradient(90deg, rgba(0,0,0,0) 0px, #000 48px, #000 calc(100% - 48px), rgba(0,0,0,0) 100%)",
          }}
        />

        {/* ---------- 洋面：光带 + 水面线 ---------- */}
        <div
          style={{
            position: "absolute",
            left: 960 - poolW / 2,
            top: SURF_Y - 16,
            width: poolW,
            height: 32,
            background:
              "linear-gradient(90deg, rgba(156,193,231,0) 0%, rgba(156,193,231,0.42) 16%, rgba(156,193,231,0.42) 84%, rgba(156,193,231,0) 100%)",
            filter: "blur(7px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 960 - poolW / 2,
            top: SURF_Y,
            width: poolW,
            height: 1.5,
            background: `linear-gradient(90deg, rgba(156,193,231,0) 0%, ${COLORS.ice} 18%, #FFFFFF 50%, ${COLORS.ice} 82%, rgba(156,193,231,0) 100%)`,
            opacity: 0.5 + 0.4 * poolP,
          }}
        />

        {/* ---------- 洋面：波光层（多条 1px 亮线错落摆动） ---------- */}
        {Array.from({ length: 10 }, (_, j) => {
          const w2 = poolW * (0.95 - j * 0.03);
          const top = SURF_Y + 15 + j * 25 + j * j * 0.85;
          const wob = Math.sin(frame / (32 + j * 7) + j * 1.3) * (1 + j * 0.35);
          const o = 0.24 - j * 0.014 + 0.07 * Math.sin(frame / 24 + j * 1.9);
          return (
            <div
              key={j}
              style={{
                position: "absolute",
                left: 960 - w2 / 2,
                top: top + wob,
                width: w2,
                height: 1,
                background: `linear-gradient(90deg, rgba(156,193,231,0) 0%, ${COLORS.ice} 32%, ${COLORS.mist} 50%, ${COLORS.ice} 68%, rgba(156,193,231,0) 100%)`,
                opacity: Math.max(0, o),
              }}
            />
          );
        })}
        {/* 水面掠过的短光斑（只在已成洋面的范围内可见） */}
        {sparkles.map((s, i) => {
          if (i % 5 !== 0) return null;
          const gx = 960 + ((((s.x + frame * s.sp) % 2200) + 2200) % 2200) - 1100;
          const inWater = clamp01((poolW / 2 - Math.abs(gx - 960)) / 120);
          return (
            <div
              key={`g${i}`}
              style={{
                position: "absolute",
                left: gx,
                top: SURF_Y + 6 + (i % 3) * 7,
                width: 34 + (i % 4) * 12,
                height: 1,
                background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)`,
                opacity:
                  inWater * (0.35 + 0.25 * Math.sin(frame / 19 + s.ph)),
              }}
            />
          );
        })}

        {/* ---------- 洋面：扩张时被点亮的波光点 ---------- */}
        {sparkles.map((s, i) => {
          const reveal = clamp01((poolW / 2 - Math.abs(s.x - 960)) / 140);
          const tw = 0.55 + 0.45 * Math.sin(frame / 17 + s.ph);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: s.x,
                top: SURF_Y + 2 + s.y + Math.sin(frame / 22 + s.ph) * 1.6,
                width: s.size,
                height: s.size,
                backgroundColor: i % 5 === 0 ? COLORS.white : COLORS.ice,
                opacity: reveal * tw * 0.7,
              }}
            />
          );
        })}

        {/* ---------- 1M 粒子字（自洋面升起） ---------- */}
        <div style={{ opacity: oneMOp }}>
          <div
            style={{
              position: "absolute",
              left: 540,
              top: 190,
              width: 520,
              height: 400,
              background: `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(77,107,254,0.2) 0%, rgba(10,10,10,0) 70%)`,
              filter: "blur(18px)",
            }}
          />
          {/* 字形体量：大点模糊，让「1M」读得出笔画 */}
          <Swarm pts={oneM} size={7.5} color={COLORS.brand} opacity={0.3} blur={7} />
          <Swarm
            pts={oneM}
            size={3.1}
            color={(i) =>
              i % 9 === 0 ? COLORS.brand : i % 3 === 0 ? COLORS.ice : COLORS.mist
            }
            opacity={(i) => 0.72 + (i % 4) * 0.07}
          />
        </div>

        {/* ---------- Terminal-Bench 2.1 对照条形图（整组自右滑入） ---------- */}
        <AbsoluteFill
          style={{
            transform: `translateX(${(1 - outExpo(clamp01((f - 100) / 34))) * 72}px)`,
          }}
        >
          <FadeText
            start={112 * k}
            y={14}
            style={{ position: "absolute", left: BAR_X, top: 306 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 24,
                  letterSpacing: "0.03em",
                  color: COLORS.ice,
                }}
              >
                Terminal-Bench 2.1
              </span>
              <span
                style={{
                  fontFamily: FONTS.sansCN,
                  fontSize: 17,
                  letterSpacing: "0.1em",
                  color: "rgba(156,193,231,0.72)",
                  border: "1px solid rgba(156,193,231,0.34)",
                  borderRadius: 4,
                  padding: "3px 10px 4px",
                  lineHeight: 1,
                }}
              >
                官方口径
              </span>
            </div>
          </FadeText>
          <div
            style={{
              position: "absolute",
              left: BAR_X,
              top: 352,
              width: 580,
              height: 1,
              backgroundColor: "rgba(156,193,231,0.2)",
              opacity: clamp01((f - 120) / 20),
            }}
          />
          {/* 满格基准线：让 87.9 的差值读得出来 */}
          <div
            style={{
              position: "absolute",
              left: BAR_X + BAR_MAX,
              top: 382,
              width: 1,
              height: 106,
              backgroundColor: "rgba(156,193,231,0.3)",
              opacity: clamp01((f - 150) / 24),
            }}
          />
          <Bar
            y={392}
            value={TB_A}
            max={TB_A}
            color={COLORS.brand}
            startBeat={128}
            f={f}
          />
          <Bar
            y={452}
            value={TB_B}
            max={TB_A}
            color="rgba(156,193,231,0.5)"
            startBeat={140}
            f={f}
          />
          <FadeText
            start={226 * k}
            y={6}
            style={{
              position: "absolute",
              left: BAR_X + BAR_MAX + 26,
              top: 386,
            }}
          >
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 30,
                letterSpacing: "0.01em",
                color: COLORS.ivory,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              90.6
            </span>
          </FadeText>
          <FadeText
            start={236 * k}
            y={6}
            style={{
              position: "absolute",
              left: BAR_X + (TB_B / TB_A) * BAR_MAX + 26,
              top: 446,
            }}
          >
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 30,
                letterSpacing: "0.01em",
                color: "rgba(249,248,248,0.72)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              87.9
            </span>
          </FadeText>
          <div
            style={{
              position: "absolute",
              left: BAR_X,
              top: 530,
              width: 580,
              height: 1,
              backgroundColor: "rgba(156,193,231,0.16)",
              opacity: clamp01((f - 240) / 20),
            }}
          />
          <FadeText
            start={246 * k}
            y={8}
            style={{ position: "absolute", left: BAR_X, top: 550 }}
          >
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 21,
                letterSpacing: "0.04em",
                color: "rgba(249,248,248,0.58)",
              }}
            >
              DeepSWE 74.2 vs 62.7 · 官方口径
            </div>
          </FadeText>
        </AbsoluteFill>

        {/* ---------- kicker ---------- */}
        <FadeText
          start={16 * k}
          style={{ position: "absolute", left: 140, top: 110 }}
        >
          <div style={{ ...TYPO.kickerCN }}>上下文 · 1M</div>
          <div style={{ ...TYPO.kickerEN, marginTop: 12, opacity: 0.75 }}>
            1m tokens of context
          </div>
        </FadeText>

        {/* ---------- 主文案块 ---------- */}
        <FadeText
          start={80 * k}
          y={14}
          style={{ position: "absolute", left: 142, top: 748, maxWidth: 1300 }}
        >
          <div
            style={{
              fontFamily: FONTS.slogan,
              fontWeight: 500,
              fontSize: 26,
              letterSpacing: "-0.01em",
              lineHeight: 1.5,
              color: COLORS.ice,
            }}
          >
            1M context — 256× longer, about a quarter more compute.
          </div>
        </FadeText>
        <FadeText
          start={62 * k}
          y={16}
          style={{ position: "absolute", left: 140, top: 806, maxWidth: 1300 }}
        >
          <div style={cnStyle}>1M 上下文 ｜ 从 4K 到 1M，</div>
          <div style={cnStyle}>单 token 解码算力仅 +约 25%</div>
        </FadeText>
      </AbsoluteFill>
    </Stage>
  );
};
