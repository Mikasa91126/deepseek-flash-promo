import { Easing } from "remotion";

/**
 * 视觉系统 —— 全部取自 DESIGN.md（品牌 token 以 deepseek.com 实测为准）。
 */
export const COLORS = {
  abyss: "#0A0A0A", // 深渊黑：基底 / 暗场
  deep: "#13263B", // 深海蓝：中段水体
  brand: "#4D6BFE", // 品牌蓝：唯一强调色
  bright: "#6799FE", // 亮蓝：次级高亮
  ice: "#9CC1E7", // 冰蓝：光柱 / 辉光
  mist: "#AFD3DC", // 微粒青：粒子雨 / 波纹
  ivory: "#F9F8F8", // 象牙白：亮场卡片底
  white: "#FFFFFF",
} as const;

export const FONTS = {
  serifCN: "'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif",
  sansCN: "'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', sans-serif",
  slogan: "'Montserrat', 'Noto Sans SC', sans-serif",
  body: "'DM Sans', 'Noto Sans SC', sans-serif",
  mono: "'Fragment Mono', 'JetBrains Mono', monospace",
} as const;

/** 动效语言参数（DESIGN.md → motionLanguage） */
export const EASE = {
  outExpo: Easing.bezier(0.16, 1, 0.3, 1), // transform 主曲线，0.6–0.9s
  emphasized: Easing.bezier(0.05, 0.7, 0.1, 1), // M3 强调入场（长位移）
  exit: Easing.bezier(0.3, 0, 0.8, 0.15), // M3 主动退场
  charReveal: Easing.bezier(0.22, 1, 0.36, 1), // 字符垂直裁剪
} as const;

export const FPS = 60;
export const DURATION_IN_FRAMES = 5400; // 90s

/** 16 镜时长（帧），总和 = 5400 */
export const SCENE_DURATIONS = [
  300, 300, 300, 360, 360, 360, 240, 300, 360, 420, 300, 420, 360, 300, 300, 420,
] as const;

export const SCENE_TITLES = [
  "黑场·第一声",
  "鲸影·探索未至之境",
  "2023·起点",
  "2024·V2·一条鲶鱼",
  "2024.12·V3·巨鲸成形",
  "2025.01·R1·惊雷",
  "2025.09·Nature 封面",
  "2025.12·四金",
  "记忆之重",
  "压缩·437×",
  "睁眼·Now we see you",
  "发布日·V4.1 Flash",
  "非对称·架构之美",
  "1M 上下文·数字落定",
  "普惠·象牙白价格卡",
  "鲸群·收尾 lockup",
] as const;

/** 第 id 镜（1 起）的起始帧 */
export const sceneStart = (id: number): number =>
  SCENE_DURATIONS.slice(0, id - 1).reduce((a, b) => a + b, 0);
