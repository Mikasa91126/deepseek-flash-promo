/**
 * Counter —— 数字滚动（easeOutExpo 1.2–1.6s，落定后静止；等宽数字）。
 * 上屏数字必须来自 DESIGN.md §6 白名单。
 */
import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { clamp01, outExpo } from "../lib/anim";

export const Counter = ({
  from = 0,
  to,
  start,
  dur = 84,
  format,
  prefix = "",
  suffix = "",
  style,
}: {
  from?: number;
  to: number;
  start: number;
  /** 滚动时长（帧），默认 1.4s */
  dur?: number;
  /** 自定义格式（默认千分位整数） */
  format?: (v: number) => string;
  prefix?: string;
  suffix?: string;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const p = outExpo(clamp01((frame - start) / dur));
  const v = from + (to - from) * p;
  const text = format
    ? format(v)
    : Math.round(v).toLocaleString("en-US");
  return (
    <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
};
