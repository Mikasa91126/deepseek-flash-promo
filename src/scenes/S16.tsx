import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { CharReveal, FadeText, TYPO } from "../comps/Text";
import { Swarm } from "../comps/Swarm";
import { COLORS } from "../theme";
import { clamp01, mulberry32, outExpo, prog } from "../lib/anim";
import { CLOUDS, drift, morph, placeCloud, swim } from "../lib/swarm";
import type { Pt } from "../lib/swarm";

/** S16 · 鲸群·收尾 lockup（1:23–1:30 · 420f）
 *  十头小鲸群游上升 → 越出海面（星空渐现）→ 聚合成官方鲸 logo → 化为 DeepSeek 官方字标
 *  → 终句「深度求索，步履不停。」定格 + 非官方标注。
 *  节拍时间以 k = dur/REF 缩放（60s 精剪版复用）。 */

/** 十头鲸的手排分布（构图优先于随机；确定性字面量） */
const POD_DEFS = [
  { x: 300, y: 800, w: 110, rise: 130, tilt: -0.06 },
  { x: 620, y: 900, w: 90, rise: 100, tilt: 0.04 },
  { x: 950, y: 780, w: 130, rise: 170, tilt: -0.03 },
  { x: 1240, y: 880, w: 100, rise: 140, tilt: 0.05 },
  { x: 1560, y: 820, w: 120, rise: 120, tilt: -0.05 },
  { x: 1700, y: 640, w: 85, rise: 90, tilt: 0.03 },
  { x: 1420, y: 620, w: 95, rise: 150, tilt: 0.06 },
  { x: 1090, y: 620, w: 80, rise: 190, tilt: -0.04 },
  { x: 760, y: 600, w: 105, rise: 200, tilt: 0.02 },
  { x: 480, y: 640, w: 90, rise: 160, tilt: -0.02 },
];
const REF = 420;

export const S16 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;

  const pods = useMemo(
    () =>
      POD_DEFS.map((pd) =>
        placeCloud(CLOUDS.whaleSm, pd.w, pd.x, pd.y, pd.tilt, pd.x > 1150),
      ),
    [],
  );

  /** 官方字标扩样到 1500 点（与鲸群总点数一致，供 morph） */
  const word1500 = useMemo(() => {
    const pts: number[][] = CLOUDS.wordmark.pts.map(([x, y]) => [x, y]);
    const r = mulberry32(66);
    while (pts.length < 1500) {
      const [x, y] =
        CLOUDS.wordmark.pts[Math.floor(r() * CLOUDS.wordmark.pts.length)];
      pts.push([x + (r() - 0.5) * 1.7, y + (r() - 0.5) * 1.7]);
    }
    return { ...CLOUDS.wordmark, pts };
  }, []);

  const logoTarget = useMemo(
    () => placeCloud(CLOUDS.whaleLg, 520, 960, 386, 0, false),
    [],
  );
  const wordTarget = useMemo(
    () => placeCloud(word1500, 900, 960, 612, 0, false),
    [word1500],
  );

  /** 当前群位（上升 + 各自摆尾） */
  const riseP = outExpo(prog(frame, 0, 150 * k));
  const fromPts: Pt[] = [];
  pods.forEach((cloud, kk) => {
    const pd = POD_DEFS[kk];
    const swam = swim(cloud, frame * (0.7 + kk * 0.045), {
      headX: pd.x - pd.w / 2,
      len: pd.w,
      amp: pd.w * 0.09,
      cycles: 0.6,
    });
    for (const p of swam) {
      fromPts.push({
        x: p.x + Math.sin(frame * 0.02 + kk * 1.7) * 6,
        y: p.y - riseP * pd.rise - (kk % 3) * 6,
      });
    }
  });

  const toLogo = morph(fromPts, logoTarget, prog(frame, 150 * k, 118 * k), 31, 62, 0.35);
  const toWord = morph(toLogo, wordTarget, prog(frame, 282 * k, 62 * k), 43, 38, 0.3);
  const freeze = 1 - prog(frame, 398 * k, 18 * k);
  const pts = drift(frame <= 282 * k ? toLogo : toWord, frame, 3.2 * freeze);

  /** 海面与星空 */
  const surfY = 1040 - outExpo(prog(frame, 90 * k, 160 * k)) * 450;
  const stars = useMemo(() => {
    const r = mulberry32(311);
    return Array.from({ length: 80 }, () => ({
      x: r() * 1920,
      y: r() * 520,
      s: 1 + r() * 1.6,
      o: 0.15 + r() * 0.4,
    }));
  }, []);
  const starsOp = clamp01((frame - 160 * k) / (110 * k)) * 0.8;
  const waterOp = clamp01((frame - 120 * k) / (120 * k));

  return (
    <Stage dur={dur} tone="abyss" vignette={false}>
      {/* 星空（上半） */}
      <AbsoluteFill>
        {stars.map((st, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: st.x,
              top: st.y,
              width: st.s,
              height: st.s,
              backgroundColor: COLORS.ivory,
              opacity: st.o * starsOp * (0.7 + 0.3 * Math.sin(frame / 70 + i)),
              borderRadius: "50%",
            }}
          />
        ))}
      </AbsoluteFill>

      {/* 水面（下半） */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: surfY,
          bottom: 0,
          background:
            "linear-gradient(180deg, rgba(103,153,254,0.16), rgba(19,38,59,0.5) 40%, rgba(10,10,10,0.55))",
          opacity: waterOp,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: surfY,
          height: 1,
          backgroundColor: COLORS.ice,
          opacity: 0.5 * waterOp,
        }}
      />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: surfY + 26 + i * 44,
            height: 1,
            backgroundColor: COLORS.bright,
            opacity:
              (0.14 - i * 0.035) *
              waterOp *
              (0.6 + 0.4 * Math.sin(frame / 60 + i * 2)),
          }}
        />
      ))}

      {/* 鲸群 → logo → wordmark 粒子 */}
      <div style={{ opacity: clamp01(frame / (24 * k)) }}>
        <Swarm
          pts={pts}
          size={(i) => (i % 13 === 0 ? 3 : 2.2)}
          color={(i) =>
            frame > 300 * k
              ? i % 10 === 0
                ? COLORS.bright
                : COLORS.brand
              : i % 11 === 0
                ? COLORS.bright
                : i % 2 === 0
                  ? COLORS.ice
                  : COLORS.mist
          }
          opacity={(i) => 0.45 + (((i * 2654435761) >>> 0) % 100) / 100 * 0.55}
        />
      </div>

      {/* 终句 */}
      <div style={{ position: "absolute", top: 796, width: "100%" }}>
        <CharReveal
          text="深度求索，步履不停。"
          start={358 * k}
          staggerFrames={2.2 * k}
          charFrames={26 * k}
          style={{ ...TYPO.poem, fontSize: 68, justifyContent: "center" }}
        />
      </div>

      {/* 非官方标注（用户拍板：加一行小字） */}
      <div
        style={{
          position: "absolute",
          top: 948,
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <FadeText start={392 * k} y={6}>
          <div
            style={{
              ...TYPO.mono,
              fontSize: 17,
              color: "rgba(249,248,248,0.42)",
              letterSpacing: "0.1em",
            }}
          >
            概念致敬片 · 非官方出品 · Fan-made concept — not affiliated with DeepSeek
          </div>
        </FadeText>
      </div>
    </Stage>
  );
};
