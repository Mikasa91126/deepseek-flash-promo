/**
 * S03 · 2023·起点（10s–15s · 300f）
 * 时间轴光轨自画面底部升起 → 第一节点亮起荡开声呐微光 → 鲸影自右上角游入并收拢成光点落在节点上。
 * 转场：自右滑入（140→0 · 26f）｜收尾 12f 淡出。
 * 节拍以 REF=300 为基准，k=dur/REF 缩放（60s 精剪版同组件复用）。
 */
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { Swarm } from "../comps/Swarm";
import { FadeText, TYPO } from "../comps/Text";
import { GlowOrb, SonarRing } from "../comps/fx";
import { COLORS, FONTS } from "../theme";
import { clamp01, mulberry32, outExpo, prog } from "../lib/anim";
import { CLOUDS, drift, morph, placeCloud, swim, transform } from "../lib/swarm";

const REF = 300;

const RAIL_Y = 640;
const NODE = { x: 560, y: RAIL_Y };
const WHALE_W = 300;

const CN: CSSProperties = {
  fontFamily: FONTS.serifCN,
  fontWeight: 300,
  fontSize: 50,
  letterSpacing: "0.08em",
  lineHeight: 1.5,
  color: COLORS.ivory,
};
const EN: CSSProperties = { ...TYPO.en, fontSize: 24, marginTop: 14 };

/** 环境微粒（确定性种子） */
const AMBIENT = (() => {
  const r = mulberry32(2023);
  return Array.from({ length: 84 }, () => ({
    x: r() * 1920,
    y: r() * 1080,
    s: 1 + r() * 1.6,
    sp: 0.05 + r() * 0.1,
    o: 0.1 + r() * 0.26,
  }));
})();

export const S03 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;

  // 转场：自右滑入
  const inP = outExpo(clamp01(frame / (26 * k)));
  const outP = clamp01((frame - (dur - 12 * k)) / (12 * k));

  // 时间轴光轨：自画面底部升至 y≈640（outExpo · 40f）
  const railP = outExpo(prog(frame, 2 * k, 40 * k));
  const railY = 1080 + (RAIL_Y - 1080) * railP;
  const railOp = clamp01(prog(frame, 2 * k, 18 * k));

  // 第一节点：亮起 + 声呐微光
  const nodeP = outExpo(prog(frame, 44 * k, 18 * k));

  // 鲸：右上角游入 → 悬停 → 收拢成光点落在节点上
  const base = useMemo(() => placeCloud(CLOUDS.whaleLg, WHALE_W, 1330, 292), []);
  const nodePts = useMemo(
    () => base.map(() => ({ x: NODE.x, y: NODE.y })),
    [base],
  );
  const enterP = outExpo(prog(frame, 22 * k, 88 * k));
  const dx = (1 - enterP) * 660;
  const dy = (1 - enterP) * -250;
  const hover = transform(base, dx, dy);
  const colP = outExpo(prog(frame, 134 * k, 56 * k));
  const moved = colP > 0 ? morph(hover, nodePts, colP, 11, 54, 0.45) : hover;
  const pts = drift(
    swim(moved, frame, {
      headX: 1330 - WHALE_W / 2 + dx,
      toward: 1,
      len: WHALE_W,
      amp: 9,
      speed: 0.85,
    }),
    frame,
    3,
  );
  const whaleOp = 0.92 * clamp01(prog(frame, 22 * k, 14 * k));

  // 落点辉光：落地瞬间爆一下，随后收为常驻微光
  const land = clamp01(prog(frame, 176 * k, 22 * k));
  const nodeGlow =
    land * (1 - 0.62 * clamp01(prog(frame, 200 * k, 44 * k))) +
    0.34 * clamp01(prog(frame, 196 * k, 70 * k));

  return (
    <Stage dur={dur} tone="abyss" rays rayX={0.3} rayIntensity={0.09}>
      <AbsoluteFill
        style={{
          opacity: clamp01(frame / (8 * k)) * (1 - outP),
          transform: `translateX(${(1 - inP) * 140}px)`,
        }}
      >
        {/* 环境微粒 */}
        <Swarm
          pts={AMBIENT.map((a) => ({
            x: a.x,
            y: (((a.y - frame * a.sp * k) % 1080) + 1080) % 1080,
          }))}
          size={(i) => AMBIENT[i].s}
          opacity={(i) => AMBIENT[i].o}
          color={(i) => (i % 9 === 0 ? COLORS.bright : COLORS.mist)}
        />

        {/* 时间轴光轨（1px）+ 刻度 */}
        <div style={{ position: "absolute", inset: 0, opacity: railOp }}>
          <div
            style={{
              position: "absolute",
              left: -220,
              top: railY,
              width: 2360,
              height: 1,
              background:
                "linear-gradient(90deg, rgba(103,153,254,0) 0%, rgba(103,153,254,0.9) 13%, rgba(103,153,254,0.9) 84%, rgba(103,153,254,0) 100%)",
              boxShadow: "0 0 14px 1px rgba(103,153,254,0.35)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -220,
              top: railY - 5,
              width: 2360,
              height: 5,
              opacity: 0.45,
              background:
                "repeating-linear-gradient(90deg, rgba(103,153,254,0.55) 0px, rgba(103,153,254,0.55) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 42px)",
              maskImage:
                "linear-gradient(90deg, rgba(0,0,0,0) 0%, #000 16%, #000 82%, rgba(0,0,0,0) 100%)",
              WebkitMaskImage:
                "linear-gradient(90deg, rgba(0,0,0,0) 0%, #000 16%, #000 82%, rgba(0,0,0,0) 100%)",
            }}
          />
        </div>

        {/* 第一节点 */}
        <div
          style={{
            position: "absolute",
            left: NODE.x - 9,
            top: NODE.y - 9,
            width: 18,
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 6 * nodeP + 2,
              height: 6 * nodeP + 2,
              backgroundColor: COLORS.bright,
              boxShadow: `0 0 ${12 * nodeP}px rgba(103,153,254,0.9)`,
            }}
          />
        </div>
        <SonarRing
          cx={NODE.x}
          cy={NODE.y}
          start={46 * k}
          dur={116 * k}
          maxR={430}
        />
        <SonarRing
          cx={NODE.x}
          cy={NODE.y}
          start={176 * k}
          dur={104 * k}
          maxR={230}
          color={COLORS.bright}
        />
        <GlowOrb cx={NODE.x} cy={NODE.y} r={9} intensity={nodeGlow} />

        {/* 鲸粒子 */}
        <Swarm
          pts={pts}
          size={2.2 - 1.0 * colP}
          opacity={whaleOp}
          color={(i) => (i % 11 === 0 ? COLORS.bright : COLORS.mist)}
        />

        {/* kicker（日期行） */}
        <FadeText
          start={58 * k}
          y={10}
          dur={40 * k}
          style={{ position: "absolute", left: 140, top: 110 }}
        >
          <div style={{ ...TYPO.kickerCN }}>2023 · 杭州</div>
        </FadeText>

        {/* 主文案块（左下） */}
        <div style={{ position: "absolute", left: 140, bottom: 160 }}>
          <FadeText start={194 * k} y={18} dur={52 * k}>
            <div style={{ ...CN }}>深度求索成立</div>
            <div style={{ ...EN }}>Hangzhou, 2023. DeepSeek is founded.</div>
          </FadeText>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
