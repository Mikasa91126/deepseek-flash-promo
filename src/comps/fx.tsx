/**
 * 氛围特效组件：颗粒噪点 / 暗角 / 光柱 / 声呐环 / 白闪 / 辉光球 / 发丝线。
 * 全部确定性（基于帧），可安全用于渲染。
 */
import type { CSSProperties } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, EASE } from "../theme";
import { clamp01, outExpo } from "../lib/anim";

/* ---------------------------------------------------------------- Grain */

const NOISE_URI =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'>` +
      `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>` +
      `<feColorMatrix type='saturate' values='0'/></filter>` +
      `<rect width='260' height='260' filter='url(#n)'/></svg>`,
  );

export const Grain = ({ opacity = 0.05 }: { opacity?: number }) => {
  const frame = useCurrentFrame();
  const x = (frame * 41) % 260;
  const y = (frame * 67) % 260;
  return (
    <div
      style={{
        position: "absolute",
        inset: -260,
        backgroundImage: `url("${NOISE_URI}")`,
        backgroundPosition: `${-x}px ${-y}px`,
        opacity,
        mixBlendMode: "soft-light",
        pointerEvents: "none",
      }}
    />
  );
};

/* ------------------------------------------------------------- Vignette */

export const Vignette = ({ strength = 0.22 }: { strength?: number }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 46%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

/* ----------------------------------------------------------- LightShaft */

/** 顶部光柱（冰蓝 god ray，径向渐变无硬边） */
export const LightShaft = ({
  x = 0.5,
  width = 1100,
  height = 1500,
  intensity = 0.14,
  tilt = 0,
  color = "#9CC1E7",
}: {
  /** 0–1 水平位置 */
  x?: number;
  width?: number;
  height?: number;
  intensity?: number;
  tilt?: number;
  color?: string;
}) => (
  <div
    style={{
      position: "absolute",
      left: `${x * 100}%`,
      top: -0.35 * height,
      width,
      height,
      marginLeft: -width / 2,
      background: `radial-gradient(ellipse 50% 62% at 50% 34%, ${color}${Math.round(
        intensity * 255,
      )
        .toString(16)
        .padStart(2, "0")}, rgba(0,0,0,0) 72%)`,
      filter: "blur(28px)",
      transform: `rotate(${tilt}deg)`,
      pointerEvents: "none",
    }}
  />
);

/* ------------------------------------------------------------- SonarRing */

export const SonarRing = ({
  cx,
  cy,
  start,
  dur = 110,
  maxR = 560,
  color = COLORS.mist,
  thickness = 1.5,
}: {
  cx: number;
  cy: number;
  start: number;
  dur?: number;
  maxR?: number;
  color?: string;
  thickness?: number;
}) => {
  const frame = useCurrentFrame();
  const p = clamp01((frame - start) / dur);
  if (p <= 0 || p >= 1) return null;
  const e = outExpo(p);
  const r = maxR * e;
  const o = (1 - p) * 0.75;
  return (
    <div
      style={{
        position: "absolute",
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        border: `${thickness}px solid ${color}`,
        opacity: o,
        pointerEvents: "none",
      }}
    />
  );
};

/* ----------------------------------------------------------------- Flash */

/** 白闪：峰值亮度可控、≤4 帧（全片仅限睁眼/闪电时刻使用） */
export const Flash = ({
  at,
  rise = 2,
  fall = 6,
  peak = 0.6,
  color = "#FFFFFF",
}: {
  at: number;
  rise?: number;
  fall?: number;
  peak?: number;
  color?: string;
}) => {
  const frame = useCurrentFrame();
  const a =
    frame < at
      ? 0
      : frame < at + rise
        ? ((frame - at) / rise) * peak
        : Math.max(0, 1 - (frame - at - rise) / fall) * peak;
  if (a <= 0.001) return null;
  return (
    <AbsoluteFill
      style={{ backgroundColor: color, opacity: a, pointerEvents: "none" }}
    />
  );
};

/* ---------------------------------------------------------------- GlowOrb */

/** 辉光球：径向发光圆（睁眼 / 水晶落定用），强度由外部帧曲线控制 */
export const GlowOrb = ({
  cx,
  cy,
  r,
  intensity,
  color = COLORS.bright,
  core = true,
}: {
  cx: number;
  cy: number;
  r: number;
  intensity: number;
  color?: string;
  core?: boolean;
}) => {
  if (intensity <= 0.001) return null;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: cx - r * 3,
          top: cy - r * 3,
          width: r * 6,
          height: r * 6,
          background: `radial-gradient(circle at 50% 50%, ${color} 0%, rgba(0,0,0,0) 60%)`,
          opacity: 0.55 * intensity,
          filter: "blur(14px)",
          pointerEvents: "none",
        }}
      />
      {core ? (
        <div
          style={{
            position: "absolute",
            left: cx - r,
            top: cy - r,
            width: r * 2,
            height: r * 2,
            borderRadius: "50%",
            background: `radial-gradient(circle at 50% 50%, #FFFFFF 0%, ${
              COLORS.ice
            } 45%, rgba(0,0,0,0) 75%)`,
            opacity: Math.min(1, intensity),
            filter: "blur(2px)",
            pointerEvents: "none",
          }}
        />
      ) : null}
    </>
  );
};

/* ------------------------------------------------------------------ Rule */

/** 发丝线：宽度从 0 展开（品牌蓝细线） */
export const Rule = ({
  start,
  dur = 50,
  width = 460,
  thickness = 1,
  color = COLORS.brand,
  style,
}: {
  start: number;
  dur?: number;
  width?: number;
  thickness?: number;
  color?: string;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame, [start, start + dur], [0, width], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.outExpo,
  });
  return (
    <div
      style={{
        width: w,
        height: thickness,
        backgroundColor: color,
        ...style,
      }}
    />
  );
};
