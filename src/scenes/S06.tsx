/**
 * S06 · 2025.01·R1·惊雷（27s–33s · 360f）
 * 海面线浮现 → 巨鲸自水下跃出（水下部分被海面裁切，露出即「破水」）→ 三圈冲击波扩满全屏
 * → 水花粒子回落 → 右侧 −$589B 巨字滚动落定（静止）。
 * 转场：settle（scale 1.04→1 + 淡入 · 首帧全黑）｜收尾 12f 淡出。
 * 节拍以 REF=360 为基准，k=dur/REF 缩放（60s 精剪版同组件复用）。
 */
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { Swarm } from "../comps/Swarm";
import { Counter } from "../comps/Counter";
import { FadeText, TYPO } from "../comps/Text";
import { SonarRing } from "../comps/fx";
import { COLORS, FONTS } from "../theme";
import { clamp01, mulberry32, outExpo, prog } from "../lib/anim";
import { CLOUDS, drift, placeCloud, swim } from "../lib/swarm";

const REF = 360;

const SEA_Y = 700;
/** 鲸：跃出前沉在水下，跃起后悬于海面之上 */
const WHALE_W = 720;
const WHALE_CX = 720;
const WHALE_Y0 = 940;
const WHALE_Y1 = 430;
const LEAP_START = 30;
const LEAP_DUR = 70;
const BREACH = 44; // 破水瞬间

const GRAV = 1500; // px/s²

/** 水花粒子（确定性） */
const SPLASH = (() => {
  const r = mulberry32(606);
  return Array.from({ length: 150 }, () => ({
    x0: WHALE_CX + (r() - 0.5) * 340,
    vx: (r() - 0.5) * 520,
    vy: -(180 + r() * 520),
    s: 1.6 + r() * 2.4,
    ph: r() * 6, // 错开起跳帧
    life: 0.9 + r() * 0.5,
  }));
})();

const CN: CSSProperties = {
  fontFamily: FONTS.serifCN,
  fontWeight: 300,
  fontSize: 42,
  letterSpacing: "0.06em",
  lineHeight: 1.5,
  color: COLORS.ivory,
};

export const S06 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;

  // settle 入场
  const inP = outExpo(clamp01(frame / (26 * k)));
  const outP = clamp01((frame - (dur - 12 * k)) / (12 * k));
  const scale = 1.04 + (1 - 1.04) * inP;

  // 海面线
  const seaOp = clamp01(prog(frame, 6 * k, 24 * k));

  // 鲸跃出
  const leapP = outExpo(clamp01((frame - LEAP_START * k) / (LEAP_DUR * k)));
  const cy = WHALE_Y0 + (WHALE_Y1 - WHALE_Y0) * leapP;
  const s = WHALE_W / 1100;
  const headX = WHALE_CX + (428 - 960) * s;
  const pts = drift(
    swim(placeCloud(CLOUDS.whaleLg, WHALE_W, WHALE_CX, cy), frame, {
      headX,
      toward: 1,
      len: WHALE_W * 0.98,
      amp: 10 + 20 * clamp01(prog(frame, LEAP_START * k, LEAP_DUR * k)),
      speed: 1.5,
    }),
    frame,
    3,
  );
  const whaleOp = clamp01(prog(frame, 12 * k, 20 * k));

  // 水花：破水后按重力回落
  const t0 = (frame - BREACH * k) / 60;
  const splash = SPLASH.map((p) => {
    const t = t0 - p.ph / 60;
    const alive = t > 0 && t < p.life;
    return {
      p,
      x: p.x0 + p.vx * Math.max(0, t),
      y: SEA_Y + p.vy * Math.max(0, t) + 0.5 * GRAV * Math.max(0, t) ** 2,
      o: alive ? clamp01(1 - t / p.life) * 0.85 : 0,
    };
  });

  return (
    <Stage dur={dur} tone="abyss">
      <AbsoluteFill
        style={{
          opacity: clamp01(frame / (10 * k)) * (1 - outP),
          transform: `scale(${scale})`,
        }}
      >
        {/* 水体（海面线以下） */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: SEA_Y,
            width: 1920,
            height: 1080 - SEA_Y,
            background:
              "linear-gradient(180deg, rgba(19,38,59,0.55) 0%, rgba(19,38,59,0.16) 55%, rgba(10,10,10,0) 100%)",
            opacity: seaOp,
          }}
        />

        {/* 巨鲸（海面以下被裁切 → 破水） */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: `inset(0px 0px ${1080 - SEA_Y}px 0px)`,
          }}
        >
          <Swarm
            pts={pts}
            size={2.3}
            opacity={0.92 * whaleOp}
            color={(i) => (i % 15 === 0 ? COLORS.bright : COLORS.mist)}
          />
        </div>

        {/* 海面线 1px + 微光辉光 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: SEA_Y - 3,
            width: 1920,
            height: 6,
            opacity: seaOp,
            background:
              "radial-gradient(ellipse 46% 50% at 38% 50%, rgba(156,193,231,0.35), rgba(0,0,0,0) 70%)",
            filter: "blur(4px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: SEA_Y,
            width: 1920,
            height: 1,
            opacity: 0.72 * seaOp,
            background:
              "linear-gradient(90deg, rgba(156,193,231,0.05) 0%, rgba(156,193,231,0.85) 12%, rgba(156,193,231,0.85) 88%, rgba(156,193,231,0.05) 100%)",
            boxShadow: "0 0 16px 1px rgba(156,193,231,0.35)",
          }}
        />

        {/* 三圈冲击波（由小到大扩满全屏，错开 10 帧） */}
        <SonarRing
          cx={WHALE_CX}
          cy={SEA_Y}
          start={BREACH * k}
          dur={120 * k}
          maxR={640}
        />
        <SonarRing
          cx={WHALE_CX}
          cy={SEA_Y}
          start={(BREACH + 10) * k}
          dur={130 * k}
          maxR={950}
          color={COLORS.ice}
        />
        <SonarRing
          cx={WHALE_CX}
          cy={SEA_Y}
          start={(BREACH + 20) * k}
          dur={140 * k}
          maxR={1350}
          color={COLORS.mist}
        />

        {/* 水花 */}
        <Swarm
          pts={splash.map((q) => ({ x: q.x, y: q.y }))}
          size={(i) => SPLASH[i].s}
          opacity={(i) => splash[i].o}
          color={(i) => (i % 6 === 0 ? COLORS.ice : COLORS.mist)}
        />

        {/* kicker（日期行） */}
        <FadeText
          start={20 * k}
          y={10}
          dur={40 * k}
          style={{ position: "absolute", left: 140, top: 110 }}
        >
          <div style={{ ...TYPO.kickerCN }}>2025.01 · R1</div>
        </FadeText>

        {/* 右侧巨字 −$589B */}
        <div
          style={{
            position: "absolute",
            right: 110,
            top: 322,
            textAlign: "right",
          }}
        >
          <FadeText start={92 * k} y={12} dur={26 * k}>
            <Counter
              to={589}
              start={96 * k}
              dur={84 * k}
              prefix="−$"
              suffix="B"
              style={{
                ...TYPO.bigNum,
                fontSize: 200,
                lineHeight: 1,
              }}
            />
          </FadeText>
          <FadeText
            start={168 * k}
            y={10}
            dur={44 * k}
            style={{ marginTop: 18 }}
          >
            <div
              style={{
                ...TYPO.mono,
                fontSize: 34,
                color: "rgba(156,193,231,0.8)",
                textAlign: "right",
              }}
            >
              −16.97%
            </div>
          </FadeText>
        </div>

        {/* 主文案块（左下） */}
        <div
          style={{ position: "absolute", left: 140, bottom: 160, maxWidth: 1460 }}
        >
          <FadeText start={196 * k} y={16} dur={52 * k}>
            <div style={{ ...CN }}>
              一天之后，英伟达蒸发约 5890 亿美元（美股单日市值蒸发纪录）
            </div>
            <div style={{ ...TYPO.en, fontSize: 24, marginTop: 16 }}>
              R1 — one day later, $589 billion vanished. A US market record.
            </div>
          </FadeText>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
