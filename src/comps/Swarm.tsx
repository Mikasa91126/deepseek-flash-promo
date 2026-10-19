/**
 * Swarm —— Canvas 粒子渲染器。每帧清屏并按 pts 重绘（确定性）。
 * 支持：方点（品牌语汇）/ 圆点、按索引取尺寸/颜色/透明度、整体模糊。
 */
import { useEffect, useRef } from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import type { Pt } from "../lib/swarm";

export const Swarm = ({
  pts,
  size = 2.2,
  color = COLORS.mist,
  opacity = 0.85,
  square = true,
  blur = 0,
  width = 1920,
  height = 1080,
}: {
  pts: Pt[];
  size?: number | ((i: number) => number);
  color?: string | ((i: number) => string);
  opacity?: number | ((i: number) => number);
  square?: boolean;
  blur?: number;
  width?: number;
  height?: number;
}) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const s = typeof size === "function" ? size(i) : size;
      ctx.globalAlpha = typeof opacity === "function" ? opacity(i) : opacity;
      ctx.fillStyle = typeof color === "function" ? color(i) : color;
      if (square) {
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, s / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, pts, size, color, opacity, square, width, height]);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      style={{
        position: "absolute",
        inset: 0,
        width,
        height,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        pointerEvents: "none",
      }}
    />
  );
};
