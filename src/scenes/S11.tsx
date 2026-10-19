import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { CharReveal, FadeText, TYPO } from "../comps/Text";
import { Flash, GlowOrb, SonarRing } from "../comps/fx";
import { Swarm } from "../comps/Swarm";
import { COLORS } from "../theme";
import { clamp01, prog } from "../lib/anim";
import { CLOUDS, drift, placeCloud, ring } from "../lib/swarm";

/** S11 · 睁眼·Now, we see you.（0:55–1:00 · 300f）
 *  两头鲸相对，一头闭目一头缓缓睁开——全片唯一 bloom；音乐在此刻静默。
 *  节拍时间以 k = dur/REF 缩放（60s 精剪版复用）。 */

const W = 560;
const CY = 516;
const AX = 596;
const BX = 1324;
/** B 鲸（头朝左）的眼位：官方鲸形眼点归一化 ≈ (0.53, 0.49) */
const EYE = { x: BX + (0.53 - 0.5) * W, y: CY + (0.49 - 0.5) * W * 0.736 };
const REF = 300;

export const S11 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;

  const baseA = useMemo(() => placeCloud(CLOUDS.whaleLg, W, AX, CY, 0, true), []);
  const baseB = useMemo(() => placeCloud(CLOUDS.whaleLg, W, BX, CY, 0, false), []);

  const approach = prog(frame, 0, dur) * 14; // 缓慢相向
  const a = drift(
    baseA.map((p) => ({ x: p.x + approach, y: p.y })),
    frame,
    2.2,
  );
  const b = drift(
    baseB.map((p) => ({ x: p.x - approach, y: p.y })),
    frame,
    2.2,
  );

  const fadeIn = clamp01((frame - 6 * k) / (40 * k));
  const whaleOp = (i: number) =>
    (0.18 + 0.05 * Math.sin(frame / 50 + i)) * fadeIn;

  /** 睁眼 */
  const eyeP = prog(frame, 92 * k, 26 * k);
  const glow = eyeP * (1 - prog(frame, 118 * k, 90 * k) * 0.62);
  const eyeDot = useMemo(() => ring(12, EYE.x, EYE.y, 5), []);
  const outOp = 1 - clamp01((frame - (dur - 8)) / 8);

  return (
    <Stage dur={dur} tone="abyss" vignette rayIntensity={0.04}>
      <div style={{ opacity: outOp }}>
        <Swarm pts={a} size={2} color={COLORS.ice} opacity={whaleOp} />
        <Swarm pts={b} size={2} color={COLORS.ice} opacity={whaleOp} />
        {/* 闭目鲸的眼：微光点（不动） */}
        <Swarm
          pts={ring(8, AX - (0.53 - 0.5) * W, EYE.y, 4)}
          size={1.8}
          color={COLORS.mist}
          opacity={0.18 * fadeIn}
        />
        {/* 睁开的眼 */}
        <Swarm
          pts={eyeDot}
          size={2.6}
          color={COLORS.white}
          opacity={eyeP * 0.9}
        />
        <GlowOrb cx={EYE.x} cy={EYE.y} r={16} intensity={glow} />
        <Flash at={96 * k} peak={0.3} rise={2} fall={12} />
        <SonarRing
          cx={EYE.x}
          cy={EYE.y}
          start={98 * k}
          dur={140 * k}
          maxR={620}
          color={COLORS.mist}
          thickness={1.1}
        />

        {/* 文案 */}
        <div style={{ position: "absolute", top: 748, width: "100%" }}>
          <CharReveal
            text="现在，我们看见你了。"
            start={136 * k}
            staggerFrames={3.6 * k}
            charFrames={32 * k}
            style={{ ...TYPO.poem, fontSize: 76, justifyContent: "center" }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 884,
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <FadeText start={182 * k}>
            <div style={{ ...TYPO.en, fontSize: 28 }}>Now, we see you.</div>
          </FadeText>
        </div>
      </div>
    </Stage>
  );
};
