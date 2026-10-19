import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { FadeText, RiseIn, TYPO } from "../comps/Text";
import { Counter } from "../comps/Counter";
import { Swarm } from "../comps/Swarm";
import { COLORS } from "../theme";
import { clamp01, outExpo, prog } from "../lib/anim";
import { CLOUDS, drift, placeCloud } from "../lib/swarm";
import type { Pt } from "../lib/swarm";

/** S09 · 记忆之重（0:42–0:48 · 360f）
 *  鲸身后拖出粒子链，越拉越长、压得鲸缓缓下沉；右上计数落定 389,120 B/token。
 *  节拍时间以 k = dur/REF 缩放（60s 精剪版复用）。 */

const CHAIN_N = 700;
/** 尾巴锚点（未下沉时），链条向 +x 方向拖出并下垂 */
const TAIL_X = 1000;
const TAIL_Y = 150;
const CHAIN_SPAN = 980;
const SPACING = CHAIN_SPAN / (CHAIN_N - 1);
const REF = 360;

export const S09 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;

  const base = useMemo(
    () => placeCloud(CLOUDS.whaleLg, 760, 640, 360, 0, false),
    [],
  );
  const sink = outExpo(prog(frame, 20 * k, 300 * k));
  const whale = drift(
    base.map((p) => ({ x: p.x - sink * 70, y: p.y + sink * 92 })),
    frame,
    2.4,
  );

  /** 链条静止形（含下垂），锚点随鲸下沉一起移动 */
  const chain = useMemo<Pt[]>(
    () =>
      Array.from({ length: CHAIN_N }, (_, i) => {
        const t = i / (CHAIN_N - 1);
        return {
          x: TAIL_X + t * CHAIN_SPAN,
          y: TAIL_Y + Math.sin(i * 0.045) * 7 + Math.pow(t, 1.7) * 185,
        };
      }),
    [],
  );

  const L = 130 + outExpo(prog(frame, 40 * k, 240 * k)) * 870; // 链条展开长度
  const chainLive: Pt[] = chain.map((p, i) => ({
    x: p.x - sink * 70 + Math.sin(frame * 0.06 + i * 0.16) * 4,
    y: p.y + sink * 92,
  }));
  const chainOp = (i: number) =>
    clamp01((L - i * SPACING) / 46) *
    ((i % 3 === 0 ? 0.85 : 0.42) +
      (((i * 2654435761) >>> 0) % 100) / 100 * 0.15);

  const outOp = 1 - clamp01((frame - (dur - 12)) / 12);

  return (
    <Stage dur={dur} tone="deep" vignette rayIntensity={0.06}>
      <RiseIn fromY={-110} dur={30 * k} style={{ position: "absolute", inset: 0 }}>
        <div style={{ opacity: outOp }}>
          <Swarm
            pts={whale}
            size={(i) => 1.7 + (i % 3) * 0.5}
            color={(i) =>
              i % 9 === 0 ? COLORS.brand : i % 4 === 0 ? COLORS.bright : COLORS.ice
            }
            opacity={(i) => 0.4 + (((i * 2654435761) >>> 0) % 100) / 100 * 0.35}
          />
          <Swarm
            pts={chainLive}
            size={(i) => (i % 9 === 0 ? 3.9 : i % 3 === 0 ? 3.2 : 1.8)}
            color={(i) =>
              i % 9 === 0 ? COLORS.white : i % 3 === 0 ? COLORS.bright : COLORS.mist
            }
            opacity={(i) =>
              chainOp(i) *
              (i % 9 === 0 ? 0.75 + 0.25 * Math.abs(Math.sin(frame * 0.12 + i)) : 1)
            }
          />

          {/* kicker 顶左 */}
          <FadeText start={14 * k} style={{ position: "absolute", left: 140, top: 110 }}>
            <div style={{ ...TYPO.kickerEN }}>THE WEIGHT · 记忆之重</div>
          </FadeText>

          {/* 右上计数 */}
          <div style={{ position: "absolute", right: 140, top: 148, textAlign: "right" }}>
            <FadeText start={110 * k} style={{ marginBottom: 14 }}>
              <div style={{ ...TYPO.kickerEN, textAlign: "right" }}>
                KV CACHE · 每 TOKEN 缓存
              </div>
            </FadeText>
            <FadeText start={128 * k}>
              <div style={{ ...TYPO.bigNum, fontSize: 92, color: COLORS.ice }}>
                <Counter to={389120} start={140 * k} dur={100 * k} />
                <span style={{ ...TYPO.mono, fontSize: 28, marginLeft: 16 }}>
                  B / token
                </span>
              </div>
            </FadeText>
          </div>

          {/* 左下文案 */}
          <div style={{ position: "absolute", left: 140, bottom: 128, maxWidth: 1280 }}>
            <FadeText start={86 * k}>
              <div style={{ ...TYPO.head, fontSize: 54 }}>它背着一个越来越重的世界——</div>
            </FadeText>
            <FadeText start={106 * k} style={{ marginTop: 18 }}>
              <div style={{ ...TYPO.sub, fontSize: 27 }}>
                每一句话，都要被记住。代价：389,120 字节 / token
              </div>
            </FadeText>
            <FadeText start={192 * k} style={{ marginTop: 14 }}>
              <div style={{ ...TYPO.en, fontSize: 23 }}>
                But memory has weight. Every token, kept — 389,120 bytes each.
              </div>
            </FadeText>
          </div>
        </div>
      </RiseIn>
    </Stage>
  );
};
