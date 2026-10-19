import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { CharReveal, FadeText, TYPO } from "../comps/Text";
import { Flash } from "../comps/fx";
import { Swarm } from "../comps/Swarm";
import { COLORS } from "../theme";
import { clamp01, mulberry32, prog } from "../lib/anim";
import { CLOUDS, drift, morph, placeCloud } from "../lib/swarm";
import type { Pt } from "../lib/swarm";

/** S12 · 发布日·V4.1 Flash（1:00–1:07 · 420f）
 *  闪电劈开黑场（克制白闪）→ 粒子自闪电拼出「V4.1 Flash」→ 日期与三端依次点亮。
 *  节拍时间以 k = dur/REF 缩放（60s 精剪版复用）。 */

const BOLT = (() => {
  const r = mulberry32(88);
  const pts: Pt[] = [{ x: 985, y: -60 }];
  let x = 985;
  let y = -60;
  while (y < 520) {
    x += (r() - 0.5) * 84;
    y += 34 + r() * 32;
    pts.push({ x, y });
  }
  return pts;
})();

const BOLT_STR = BOLT.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

/** 沿闪电折线均匀取 950 点（= tV41flash 点数）作为爆散起点 */
const BOLT_CLOUD: Pt[] = (() => {
  const n = 950;
  const segs = BOLT.length - 1;
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * segs;
    const s = Math.min(Math.floor(t), segs - 1);
    const l = t - s;
    return {
      x: BOLT[s].x + (BOLT[s + 1].x - BOLT[s].x) * l,
      y: BOLT[s].y + (BOLT[s + 1].y - BOLT[s].y) * l,
    };
  });
})();

const FONTS_MONO = "'Fragment Mono', 'JetBrains Mono', monospace";
const CHIPS = ["2026.09.10", "网页 Web", "App", "API"];
const REF = 420;

export const S12 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;

  const target = useMemo(
    () => placeCloud(CLOUDS.tV41flash, 1300, 960, 430, 0, false),
    [],
  );
  const formed = morph(BOLT_CLOUD, target, prog(frame, 14 * k, 112 * k), 17, 82, 0.4);
  const pts = drift(formed, frame, 3);
  const partOp = clamp01((frame - 8 * k) / (10 * k));

  const boltOp =
    frame < 6 * k || frame > 14 * k ? 0 : frame % 2 === 0 ? 0.95 : 0.5;

  const outOp = 1 - clamp01((frame - (dur - 12)) / 12);

  return (
    <Stage dur={dur} tone="abyss" rays rayX={0.5} rayIntensity={0.09}>
      <div style={{ opacity: outOp }}>
        {/* 闪电 */}
        {boltOp > 0 ? (
          <AbsoluteFill>
            <svg width={1920} height={1080} style={{ position: "absolute" }}>
              <polyline
                points={BOLT_STR}
                fill="none"
                stroke="#EAF2FF"
                strokeWidth={3.2}
                strokeLinejoin="round"
                opacity={boltOp}
                style={{ filter: "drop-shadow(0 0 18px rgba(156,193,231,0.95))" }}
              />
            </svg>
          </AbsoluteFill>
        ) : null}
        <Flash at={8 * k} peak={0.5} rise={1} fall={9} />

        <Swarm
          pts={pts}
          size={(i) => (i % 13 === 0 ? 3 : 2.1)}
          color={(i) =>
            i % 9 === 0 ? COLORS.bright : i % 2 === 0 ? COLORS.ice : COLORS.white
          }
          opacity={(i) =>
            partOp * (0.55 + (((i * 2654435761) >>> 0) % 100) / 100 * 0.45)
          }
        />

        {/* 官方主题词「更强、更快、更普惠」 */}
        <div style={{ position: "absolute", top: 646, width: "100%" }}>
          <CharReveal
            text="更强、更快、更普惠"
            start={148 * k}
            staggerFrames={3.2 * k}
            charFrames={30 * k}
            style={{ ...TYPO.poem, fontSize: 58, justifyContent: "center" }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 792,
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <FadeText start={186 * k}>
            <div style={{ ...TYPO.en, fontSize: 26 }}>
              smarter, faster, more efficient.
            </div>
          </FadeText>
        </div>

        {/* 日期 + 三端 chips */}
        <div
          style={{
            position: "absolute",
            top: 872,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            gap: 22,
          }}
        >
          {CHIPS.map((c, i) => (
            <FadeText key={c} start={214 * k + i * 16 * k} y={14}>
              <div
                style={{
                  padding: "14px 26px",
                  borderRadius: 10,
                  border: "1px solid rgba(249,248,248,0.16)",
                  backgroundColor: "rgba(255,255,255,0.045)",
                  fontFamily: FONTS_MONO,
                  fontSize: 21,
                  letterSpacing: "0.1em",
                  color: "rgba(249,248,248,0.86)",
                }}
              >
                {c}
              </div>
            </FadeText>
          ))}
        </div>
      </div>
    </Stage>
  );
};
