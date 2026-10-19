/**
 * Stage —— 场景舞台包装：底色 / 单镜 camera creep / 顶光 / 暗角 / 颗粒。
 * 所有场景都应包在 Stage 里，保证全片质感统一与「镜内永不静止」的呼吸感。
 */
import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { Grain, LightShaft, Vignette } from "./fx";

export const Stage = ({
  dur,
  tone = "abyss",
  rays = false,
  rayX = 0.5,
  rayIntensity = 0.13,
  grain = true,
  vignette = true,
  creep = true,
  children,
}: {
  /** 本镜时长（帧）——camera creep 与内部节奏以此为基准 */
  dur: number;
  tone?: "abyss" | "deep" | "ivory";
  rays?: boolean;
  rayX?: number;
  rayIntensity?: number;
  grain?: boolean;
  vignette?: boolean;
  creep?: boolean;
  children: ReactNode;
}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, dur], [1.004, 1.022]);
  const bg =
    tone === "ivory"
      ? COLORS.ivory
      : tone === "deep"
        ? COLORS.deep
        : COLORS.abyss;
  return (
    <AbsoluteFill style={{ backgroundColor: bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{ transform: creep ? `scale(${scale})` : undefined }}
      >
        {children}
      </AbsoluteFill>
      {rays ? (
        <LightShaft x={rayX} intensity={rayIntensity} />
      ) : null}
      {vignette ? <Vignette /> : null}
      {grain ? <Grain /> : null}
    </AbsoluteFill>
  );
};
