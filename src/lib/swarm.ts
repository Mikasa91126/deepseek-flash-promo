/**
 * 粒子群引擎 —— 全片的核心技术。
 * 所有点云来自离线生成器（tools/make_points.py），坐标为原 SVG/文本坐标系（y 向下）。
 * 本文件全部为纯函数：确定性、无系统时钟、逐帧可复现。
 */
import whaleLg from "../assets/points/whale-lg.json";
import whaleMd from "../assets/points/whale-md.json";
import whaleSm from "../assets/points/whale-sm.json";
import wordmark from "../assets/points/wordmark.json";
import tV41flash from "../assets/points/t-v41flash.json";
import t437 from "../assets/points/t-437.json";
import t1m from "../assets/points/t-1m.json";
import { clamp01, outExpo } from "./anim";

export type Pt = { x: number; y: number };
export type Cloud = {
  w: number;
  h: number;
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
  pts: number[][];
};

const asCloud = (j: unknown): Cloud => j as Cloud;

/** 全部点云（官方鲸鱼 icon / 官方 wordmark / 文本字云） */
export const CLOUDS = {
  /** 官方鲸鱼 1500 点（主鲸） */
  whaleLg: asCloud(whaleLg),
  /** 官方鲸鱼 480 点（中景 / 分体鲸） */
  whaleMd: asCloud(whaleMd),
  /** 官方鲸鱼 150 点（远景 / 鲸群） */
  whaleSm: asCloud(whaleSm),
  /** DeepSeek 官方字标 1100 点 */
  wordmark: asCloud(wordmark),
  /** "V4.1 Flash" 950 点 */
  tV41flash: asCloud(tV41flash),
  /** "437×" 700 点 */
  t437: asCloud(t437),
  /** "1M" 520 点 */
  t1m: asCloud(t1m),
} as const;

/**
 * 把点云缩放到目标宽度并按中心定位；可选旋转（弧度）与水平镜像。
 * 返回值是「已布局」的 Pt[]，可直接交给 morph / swim / Swarm 绘制。
 */
export const placeCloud = (
  cloud: Cloud,
  targetW: number,
  cx: number,
  cy: number,
  rot = 0,
  flipX = false,
): Pt[] => {
  const bw = cloud.maxx - cloud.minx;
  const bh = cloud.maxy - cloud.miny;
  const s = targetW / bw;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const hw = (bw * s) / 2;
  const hh = (bh * s) / 2;
  return cloud.pts.map(([x, y]) => {
    let px = (x - cloud.minx) * s - hw;
    let py = (y - cloud.miny) * s - hh;
    if (flipX) px = -px;
    return { x: cx + px * cos - py * sin, y: cy + px * sin + py * cos };
  });
};

/**
 * 群形态变换：from → to（长度必须一致）。
 * - p: 0→1 总进度（配合 prog() 使用）
 * - stagger: 逐粒子延时占比（0.35 表示最多 35% 的进度差，pow(i,0.8) 式错落由 seed 打散）
 * - arc: 途中垂直偏移幅度（px），制造「绕过」的弧线
 */
export const morph = (
  from: Pt[],
  to: Pt[],
  p: number,
  seed = 1,
  arc = 0,
  stagger = 0.35,
): Pt[] => {
  const n = Math.min(from.length, to.length);
  const out: Pt[] = new Array(n);
  for (let i = 0; i < n; i++) {
    // 确定性错落：用整数散列得到 [0,1) 的伪随机
    const h = ((i * 2654435761) >>> 0) % 1000 / 1000;
    const s = h * stagger;
    const lp = clamp01((p - s) / Math.max(0.0001, 1 - s));
    const e = outExpo(lp);
    const ax = from[i].x;
    const ay = from[i].y;
    const bx = to[i].x;
    const by = to[i].y;
    let x = ax + (bx - ax) * e;
    let y = ay + (by - ay) * e;
    if (arc !== 0) {
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const dir = h > 0.5 ? 1 : -1;
      const bulge = Math.sin(e * Math.PI) * arc * dir;
      x += (-dy / len) * bulge;
      y += (dx / len) * bulge;
    }
    out[i] = { x, y };
  }
  return out;
};

/**
 * 恒常微漂浮（呼吸感底噪）：每帧给每个粒子加一点正弦噪声位移。
 * 无随机数分配，纯 hash 相位，确定性。
 */
export const drift = (
  pts: Pt[],
  frame: number,
  amp = 5,
  speed = 1,
): Pt[] => {
  const out: Pt[] = new Array(pts.length);
  for (let i = 0; i < pts.length; i++) {
    const a = 0.35 + 0.65 * (((i * 7919) % 100) / 100);
    const ph1 = i * 2.39996;
    const ph2 = i * 1.61803;
    out[i] = {
      x: pts[i].x + Math.sin(frame * 0.021 * speed + ph1) * amp * a,
      y: pts[i].y + Math.cos(frame * 0.017 * speed + ph2) * amp * a,
    };
  }
  return out;
};

/**
 * 鲸游动形变：沿身体的 x 方向施加正弦波，振幅从「头部 head」向尾部线性增强。
 * 应用到已布局的鲸鱼点云上，得到摆尾游动的效果。
 */
export const swim = (
  pts: Pt[],
  frame: number,
  opts: {
    /** 波形起点 x（通常 = 鲸头所在 x，此处振幅为 0） */
    headX: number;
    /** 到尾部方向：+1 = x 增大方向为尾，-1 = 相反 */
    toward?: 1 | -1;
    /** 体长（px），决定振幅增长距离 */
    len: number;
    /** 尾部最大摆幅（px） */
    amp: number;
    /** 波动速度倍率 */
    speed?: number;
    /** 体长内包含的波数 */
    cycles?: number;
  },
): Pt[] => {
  const toward = opts.toward ?? 1;
  const w = 2 * Math.PI * (opts.cycles ?? 0.55);
  const ph = frame * 0.055 * (opts.speed ?? 1);
  const out: Pt[] = new Array(pts.length);
  for (let i = 0; i < pts.length; i++) {
    const t = clamp01(((pts[i].x - opts.headX) * toward) / opts.len);
    const a = Math.pow(t, 1.15) * opts.amp;
    out[i] = {
      x: pts[i].x,
      y: pts[i].y + Math.sin(ph + t * w) * a,
    };
  }
  return out;
};

/** 把一撮点云按 (dx,dy) 平移、scale 缩放（以质心为基准） */
export const transform = (
  pts: Pt[],
  dx = 0,
  dy = 0,
  scale = 1,
): Pt[] => {
  if (scale === 1) return pts.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  let mx = 0;
  let my = 0;
  for (const p of pts) {
    mx += p.x;
    my += p.y;
  }
  mx /= pts.length;
  my /= pts.length;
  return pts.map((p) => ({
    x: mx + (p.x - mx) * scale + dx,
    y: my + (p.y - my) * scale + dy,
  }));
};

/** 在圆环上均匀撒点（用于「光点分裂游散」的起/终态） */
export const ring = (
  n: number,
  cx: number,
  cy: number,
  r: number,
  phase = 0,
): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + phase;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });

/** 从一条线段采样 n 点（粒子链用） */
export const line = (
  n: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : i / (n - 1);
    return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
  });
