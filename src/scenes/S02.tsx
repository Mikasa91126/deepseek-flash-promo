import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { CharReveal, FadeText, TYPO } from "../comps/Text";
import { Rule } from "../comps/fx";
import { Swarm } from "../comps/Swarm";
import { COLORS } from "../theme";
import { clamp01, mulberry32, outExpo, prog } from "../lib/anim";
import { CLOUDS, drift, morph, placeCloud, swim } from "../lib/swarm";
import type { Pt } from "../lib/swarm";

/** S02 · 鲸影·探索未至之境（0:05–0:10 · 300f）
 *  粒子雨汇聚成官方鲸形 → 摆尾向深处游动 → 主标落定。
 *  节拍时间以 k = dur/REF 缩放（60s 精剪版复用）。 */

const W = 880;
const CX = 960;
const CY = 420;
const REF = 300;

export const S02 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;

  const target = useMemo(
    () => placeCloud(CLOUDS.whaleLg, W, CX, CY, 0, false),
    [],
  );
  const rain = useMemo<Pt[]>(() => {
    const r = mulberry32(77);
    return Array.from({ length: target.length }, () => ({
      x: r() * 1920,
      y: -280 - r() * 960,
    }));
  }, [target.length]);

  const formP = prog(frame, 24 * k, 156 * k);
  const formed = morph(rain, target, formP, 77, 80, 0.42);

  const swimF = Math.max(0, frame - 170 * k);
  const sink = outExpo(prog(frame, 150 * k, 150 * k)) * 46;
  const swimming = swim(
    formed.map((p) => ({ x: p.x, y: p.y + sink })),
    swimF,
    { headX: CX - W / 2, len: W, amp: 26, speed: 1, cycles: 0.55, toward: 1 },
  );
  const pts = drift(swimming, frame, 3.2);
  const outOp = 1 - clamp01((frame - (dur - 10)) / 10);

  return (
    <Stage dur={dur} tone="abyss" rays rayX={0.5} rayIntensity={0.12}>
      <div style={{ opacity: outOp }}>
        <Swarm
          pts={pts}
          size={(i) => 1.5 + (i % 4) * 0.45}
          color={(i) =>
            i % 11 === 0 ? COLORS.brand : i % 3 === 0 ? COLORS.bright : COLORS.mist
          }
          opacity={(i) =>
            (0.45 + (((i * 2654435761) >>> 0) % 100) / 100 * 0.45) *
            clamp01((frame - 6 * k) / (22 * k))
          }
        />

        {/* 主标 */}
        <div style={{ position: "absolute", top: 738, width: "100%" }}>
          <CharReveal
            text="探索未至之境"
            start={206 * k}
            staggerFrames={4.2 * k}
            charFrames={37.2 * k}
            style={{ ...TYPO.poem, fontSize: 92, justifyContent: "center" }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 896,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 22,
          }}
        >
          <Rule start={262 * k} width={420} />
          <FadeText start={268 * k}>
            <div style={{ ...TYPO.en, fontSize: 30 }}>Into the unknown.</div>
          </FadeText>
        </div>
      </div>
    </Stage>
  );
};
