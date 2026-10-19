/**
 * 字体注册 —— 文件位于 public/fonts/（由 tools/fetch_fonts.sh 拉取）。
 * 缺失时降级为系统字体并在控制台告警，而不是让渲染失败。
 */
import { staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";

type Entry = [family: string, file: string, weight: string];

const ENTRIES: Entry[] = [
  ["Noto Serif SC", "NotoSerifSC.ttf", "200"],
  ["Noto Serif SC", "NotoSerifSC.ttf", "300"],
  ["Noto Serif SC", "NotoSerifSC.ttf", "400"],
  ["Noto Sans SC", "NotoSansSC.ttf", "400"],
  ["Noto Sans SC", "NotoSansSC.ttf", "500"],
  ["Noto Sans SC", "NotoSansSC.ttf", "700"],
  ["Montserrat", "Montserrat.ttf", "500"],
  ["Montserrat", "Montserrat.ttf", "600"],
  ["DM Sans", "DMSans.ttf", "400"],
  ["DM Sans", "DMSans.ttf", "500"],
  ["Fragment Mono", "FragmentMono-Regular.ttf", "400"],
];

let started = false;

/** 幂等：模块被多次导入也只注册一轮 */
export const loadAllFonts = (): void => {
  if (started) return;
  started = true;
  for (const [family, file, weight] of ENTRIES) {
    loadFont({ family, url: staticFile(`fonts/${file}`), weight }).catch(() => {
      // 字体缺失：渲染继续，走 FONTS 里的系统回退
      console.warn(`[fonts] failed to load ${family} ${weight} (${file}) — falling back`);
    });
  }
};

loadAllFonts();
