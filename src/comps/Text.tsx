/**
 * 字幕系统：字符垂直裁剪 / 双曲线淡入 / 常用排版预设（TYPO）。
 * 排版纪律见 DESIGN.md §2.2：sentence case、中文引语「」、数字等宽。
 */
import type { CSSProperties, ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, EASE, FONTS } from "../theme";
import { clamp01, outExpo } from "../lib/anim";

/* 常用排版预设 —— 场景直接 spread，也可覆盖 */
export const TYPO = {
  /** 日期/章节小标（中文，宽字距） */
  kickerCN: {
    fontFamily: FONTS.sansCN,
    fontWeight: 500,
    fontSize: 30,
    letterSpacing: "0.38em",
    color: COLORS.bright,
  } as CSSProperties,
  /** 日期/章节小标（英文 mono） */
  kickerEN: {
    fontFamily: FONTS.mono,
    fontSize: 21,
    letterSpacing: "0.22em",
    color: "rgba(249,248,248,0.55)",
  } as CSSProperties,
  /** 主标（思源宋体 Light） */
  head: {
    fontFamily: FONTS.serifCN,
    fontWeight: 300,
    fontSize: 84,
    letterSpacing: "0.12em",
    lineHeight: 1.4,
    color: COLORS.ivory,
  } as CSSProperties,
  /** 诗句（思源宋体，大） */
  poem: {
    fontFamily: FONTS.serifCN,
    fontWeight: 300,
    fontSize: 96,
    letterSpacing: "0.16em",
    lineHeight: 1.45,
    color: COLORS.ivory,
  } as CSSProperties,
  /** 正文说明（思源黑体） */
  sub: {
    fontFamily: FONTS.sansCN,
    fontWeight: 400,
    fontSize: 30,
    letterSpacing: "0.05em",
    lineHeight: 1.75,
    color: "rgba(249,248,248,0.8)",
  } as CSSProperties,
  /** 英文副题（Montserrat） */
  en: {
    fontFamily: FONTS.slogan,
    fontWeight: 500,
    fontSize: 27,
    letterSpacing: "-0.01em",
    lineHeight: 1.5,
    color: COLORS.ice,
  } as CSSProperties,
  /** 巨数字（Montserrat，等宽数字） */
  bigNum: {
    fontFamily: FONTS.slogan,
    fontWeight: 600,
    fontSize: 148,
    letterSpacing: "-0.03em",
    lineHeight: 1,
    color: COLORS.brand,
    fontVariantNumeric: "tabular-nums",
  } as CSSProperties,
  /** 数据铭牌（Fragment Mono） */
  mono: {
    fontFamily: FONTS.mono,
    fontSize: 22,
    letterSpacing: "0.04em",
    color: "rgba(249,248,248,0.6)",
    fontVariantNumeric: "tabular-nums",
  } as CSSProperties,
} as const;

/* --------------------------------------------------------- CharReveal */

/** 字符垂直裁剪上落（translateY -110% → 0，70ms 错落，单字 0.62s，blur 8→0） */
export const CharReveal = ({
  text,
  start = 0,
  staggerFrames = 4.2,
  charFrames = 37.2,
  style,
  fromBelow = false,
}: {
  text: string;
  start?: number;
  staggerFrames?: number;
  charFrames?: number;
  style?: CSSProperties;
  /** true = 从下方浮入；默认从上方落下 */
  fromBelow?: boolean;
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", ...style }}>
      {Array.from(text).map((ch, i) => {
        const t0 = start + i * staggerFrames;
        const p = interpolate(frame, [t0, t0 + charFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: EASE.charReveal,
        });
        const blur = (1 - p) * 8;
        const dir = fromBelow ? 1 : -1;
        return (
          <span
            key={i}
            style={{ display: "inline-block", overflow: "hidden" }}
          >
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - p) * 110 * dir}%)`,
                filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
              }}
            >
              {ch === " " ? " " : ch}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------ FadeText */

/**
 * 双曲线节奏淡入：opacity 走 0.2s quad，位移走 0.8s easeOutExpo。
 * fadeOut 可给绝对帧；不给则保持。
 */
export const FadeText = ({
  start,
  fadeOut,
  y = 16,
  blur = 0,
  dur = 48,
  outDur = 22,
  children,
  style,
}: {
  start: number;
  fadeOut?: number;
  /** 入场位移距离（px） */
  y?: number;
  /** 入场模糊（px） */
  blur?: number;
  /** transform 时长（帧） */
  dur?: number;
  outDur?: number;
  children: ReactNode;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const opIn = clamp01((frame - start) / 12);
  const opOut =
    fadeOut === undefined ? 1 : 1 - clamp01((frame - fadeOut) / outDur);
  const op = opIn * opOut;
  const tp = outExpo(clamp01((frame - start) / dur));
  return (
    <div
      style={{
        opacity: op,
        transform: `translateY(${(1 - tp) * y}px)`,
        filter: blur > 0 && tp < 1 ? `blur(${(1 - tp) * blur}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/* ------------------------------------------------------ SlideIn / RiseIn */

/** 横向滑入（transition grammar：lateral slide —— 同色调镜间用，自右弹入） */
export const SlideIn = ({
  dur = 26,
  fromX = 140,
  children,
  style,
}: {
  dur?: number;
  fromX?: number;
  children: ReactNode;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const p = outExpo(clamp01(frame / dur));
  const op = clamp01(frame / 12);
  return (
    <div
      style={{
        opacity: op,
        transform: `translateX(${(1 - p) * fromX}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** 竖向上升滑入（transition grammar：vertical rise；fromY 取负值 = 自上方下落） */
export const RiseIn = ({
  dur = 30,
  fromY = 110,
  children,
  style,
}: {
  dur?: number;
  fromY?: number;
  children: ReactNode;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const p = outExpo(clamp01(frame / dur));
  const op = clamp01(frame / 12);
  return (
    <div
      style={{
        opacity: op,
        transform: `translateY(${(1 - p) * fromY}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
