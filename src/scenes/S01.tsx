import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { CharReveal, FadeText, TYPO } from "../comps/Text";
import { GlowOrb, SonarRing } from "../comps/fx";
import { Swarm } from "../comps/Swarm";
import { COLORS } from "../theme";
import { clamp01, mulberry32 } from "../lib/anim";
import type { Pt } from "../lib/swarm";

/** S01 · 黑场·第一声（0:00–0:05 · 300f）
 *  粒子雨 → 一粒悬停 → 声呐波纹 → 副题浮现。全片最静的一镜。
 *  节拍时间以 k = dur/REF 缩放（60s 精剪版复用）。 */

type Dust = { x: number; y0: number; sp: number; ph: number; o: number; s: number };

const DUST: Dust[] = (() => {
  const r = mulberry32(101);
  return Array.from({ length: 130 }, () => ({
    x: r() * 1920,
    y0: r() * 1260,
    sp: 5 + r() * 9,
    ph: r() * 6.283,
    o: 0.1 + r() * 0.35,
    s: r() < 0.12 ? 2.4 : 1.4,
  }));
})();

const HOVER_I = 17;
const HOVER_X = 960;
const HOVER_Y = 470;
const HOVER_AT = 226;
const REF = 300;

export const S01 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;
  const hoverAt = HOVER_AT * k;
  const revealIn = clamp01((frame - 12 * k) / (24 * k)); // 片头纯黑（12k 帧）

  const pts: Pt[] = DUST.map((d, i) => {
    if (i === HOVER_I && frame >= hoverAt) return { x: HOVER_X, y: HOVER_Y };
    const fall = (frame * d.sp) / 60;
    return {
      x: d.x + Math.sin(frame / 110 + d.ph) * 7,
      y: ((d.y0 + fall) % 1260) - 90,
    };
  });

  const hoverP =
    frame >= hoverAt ? clamp01((frame - hoverAt) / (12 * k)) : 0;
  const outOp = 1 - clamp01((frame - (dur - 10)) / 10);

  return (
    <Stage dur={dur} tone="abyss">
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 46% 30% at 50% 90%, rgba(77,107,254,0.07), rgba(0,0,0,0) 70%)",
        }}
      />
      <div style={{ opacity: outOp }}>
        <Swarm
          pts={pts}
          size={(i) => DUST[i].s}
          color={(i) =>
            i === HOVER_I ? COLORS.ice : i % 9 === 0 ? COLORS.bright : COLORS.mist
          }
          opacity={(i) =>
            (i === HOVER_I ? 0.35 + hoverP * 0.6 : DUST[i].o) * revealIn
          }
        />
        <GlowOrb
          cx={HOVER_X}
          cy={HOVER_Y}
          r={9}
          intensity={hoverP * 0.5}
        />
        <SonarRing
          cx={HOVER_X}
          cy={HOVER_Y}
          start={hoverAt + 2 * k}
          dur={118 * k}
          maxR={380}
          color={COLORS.mist}
          thickness={1.2}
        />
        <SonarRing
          cx={HOVER_X}
          cy={HOVER_Y}
          start={hoverAt + 24 * k}
          dur={126 * k}
          maxR={268}
          color={COLORS.bright}
          thickness={1}
        />

        {/* 副题 */}
        <div style={{ position: "absolute", top: 726, width: "100%" }}>
          <CharReveal
            text="一切，从一次深潜开始。"
            start={232 * k}
            staggerFrames={3.4 * k}
            charFrames={30 * k}
            style={{ ...TYPO.poem, fontSize: 74, justifyContent: "center" }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 872,
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <FadeText start={280 * k}>
            <div style={{ ...TYPO.en }}>It begins with one dive.</div>
          </FadeText>
        </div>
      </div>
    </Stage>
  );
};
