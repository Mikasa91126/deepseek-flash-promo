import type { CSSProperties } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, EASE, FONTS } from "./theme";
import { mulberry32 } from "./lib/anim";

/**
 * StyleLab —— 美术验证场景（非成片内容）。
 * 用途：字体是否加载、色板观感、字符垂直裁剪手感、粒子氛围、光柱构图。
 */

const TITLE = "探索未至之境";

const PARTICLES = (() => {
  const r = mulberry32(7);
  return Array.from({ length: 170 }, (_, i) => ({
    x: r() * 1920,
    y0: r() * 1080,
    size: 1 + r() * 1.8,
    speed: 5 + r() * 14, // px/s，向上缓浮
    opacity: 0.1 + r() * 0.35,
    swayPhase: r() * Math.PI * 2,
    color:
      i % 7 === 0 ? COLORS.brand : i % 3 === 0 ? COLORS.bright : COLORS.mist,
  }));
})();

const SWATCHES = [
  ["#0A0A0A", "abyss"],
  ["#13263B", "deep"],
  ["#4D6BFE", "brand"],
  ["#6799FE", "bright"],
  ["#9CC1E7", "ice"],
  ["#AFD3DC", "mist"],
  ["#F9F8F8", "ivory"],
] as const;

const CharReveal = ({
  text,
  start,
  style,
}: {
  text: string;
  start: number;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", justifyContent: "center", ...style }}>
      {Array.from(text).map((ch, i) => {
        const t0 = start + i * 4.2; // 70ms stagger
        const p = interpolate(frame, [t0, t0 + 37.2], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: EASE.charReveal,
        });
        const blur = (1 - p) * 8;
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden" }}>
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - p) * -110}%)`,
                filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
              }}
            >
              {ch}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export const StyleLab = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // 单镜 camera creep：1.005 → 1.02，镜内永不重置
  const creep = interpolate(frame, [0, durationInFrames], [1.005, 1.02]);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.abyss, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${creep})` }}>
        {/* 顶部光柱 */}
        <div
          style={{
            position: "absolute",
            left: "36%",
            top: -260,
            width: 760,
            height: 1700,
            background: `linear-gradient(180deg, rgba(156,193,231,0.13), rgba(156,193,231,0) 72%)`,
            filter: "blur(70px)",
            transform: "rotate(7deg)",
          }}
        />

        {/* 粒子雨 */}
        {PARTICLES.map((p, i) => {
          const y = 1080 - ((p.y0 + (frame * p.speed) / 60) % 1080);
          const sway = Math.sin(frame / 90 + p.swayPhase) * 9;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: p.x + sway,
                top: y,
                width: p.size,
                height: p.size,
                borderRadius: 1,
                backgroundColor: p.color,
                opacity: p.opacity,
              }}
            />
          );
        })}

        {/* 中央标题 */}
        <div
          style={{
            position: "absolute",
            top: 388,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <CharReveal
            text={TITLE}
            start={14}
            style={{
              fontFamily: FONTS.serifCN,
              fontWeight: 300,
              fontSize: 108,
              lineHeight: 1.4,
              letterSpacing: "0.16em",
              color: COLORS.ivory,
              paddingLeft: "0.16em",
            }}
          />
          {/* 品牌蓝发丝线 */}
          <div
            style={{
              marginTop: 34,
              width: interpolate(frame, [46, 96], [0, 460], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: EASE.outExpo,
              }),
              height: 1,
              backgroundColor: COLORS.brand,
              opacity: 0.9,
            }}
          />
          <div
            style={{
              marginTop: 30,
              fontFamily: FONTS.slogan,
              fontWeight: 500,
              fontSize: 32,
              letterSpacing: "-0.02em",
              color: COLORS.ice,
              opacity: interpolate(frame, [64, 78], [0, 0.95], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            Into the unknown.
          </div>
        </div>

        {/* 色板检查条 */}
        <div
          style={{
            position: "absolute",
            bottom: 64,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            gap: 18,
          }}
        >
          {SWATCHES.map(([hex, name], i) => {
            const p = interpolate(frame, [96 + i * 5, 126 + i * 5], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: EASE.outExpo,
            });
            return (
              <div key={hex} style={{ opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    backgroundColor: hex,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                />
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: FONTS.mono,
                    fontSize: 14,
                    color: "rgba(249,248,248,0.55)",
                    textAlign: "center",
                  }}
                >
                  {name}
                </div>
              </div>
            );
          })}
        </div>

        {/* 角落标牌 */}
        <div
          style={{
            position: "absolute",
            left: 48,
            bottom: 46,
            fontFamily: FONTS.mono,
            fontSize: 18,
            letterSpacing: "0.06em",
            color: "rgba(249,248,248,0.45)",
          }}
        >
          DEEPSEEK V4.1 FLASH · STYLELAB · F{String(frame).padStart(4, "0")}
        </div>
      </div>
    </AbsoluteFill>
  );
};
