/**
 * 动效工具库 —— 参数与 DESIGN.md「动效语言」一致。
 * 一切确定性：无系统时钟、无 Math.random，逐帧可复现。
 */
import { Easing } from "remotion";

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** frame ∈ [start, start+dur] → 0..1 */
export const prog = (frame: number, start: number, dur: number): number =>
  clamp01((frame - start) / Math.max(1, dur));

/** 双曲线节奏：opacity 短 ramp（quad，约 0.18–0.25s）；transform 走 outExpo（约 3× 时长） */
export const outExpo = Easing.bezier(0.16, 1, 0.3, 1);

/** 错落：delay = pow(i, 0.8) × 45ms（@60fps = 2.7 帧/单位） */
export const stagger = (i: number, msPer = 45, fps = 60): number =>
  Math.pow(i, 0.8) * (msPer / 1000) * fps;

/** 确定性 PRNG（mulberry32），用于粒子 / jitter，保证逐帧可复现 */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** 平滑的 0→1→0 呼吸 …… 用于恒常微动 */
export const breathe = (frame: number, periodFrames: number, phase = 0): number =>
  0.5 + 0.5 * Math.sin(((frame / periodFrames) * 2 * Math.PI) + phase);
