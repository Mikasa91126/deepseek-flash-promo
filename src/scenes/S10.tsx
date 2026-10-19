import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { FadeText, TYPO } from "../comps/Text";
import { Counter } from "../comps/Counter";
import { GlowOrb } from "../comps/fx";
import { Swarm } from "../comps/Swarm";
import { COLORS } from "../theme";
import { clamp01, mulberry32, outExpo, prog } from "../lib/anim";
import { CLOUDS, drift, morph, placeCloud } from "../lib/swarm";
import type { Pt } from "../lib/swarm";

/** S10 · 压缩·437×（0:48–0:55 · 420f）
 *  链条向心收拢 → 计数 48,068 → 3,514 → 890 → 凝成水晶 → 粒子弹出「437×」。
 *  节拍时间以 k = dur/REF 缩放（60s 精剪版复用）。 */

const N = 700;
const CENTER = { x: 960, y: 512 };
/** 承接 S9 终态：尾巴锚点已随鲸下沉 */
const TAIL = { x: 930, y: 242 };
const CHAIN_SPAN = 980;
const REF = 420;

export const S10 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;

  /** 起态 A：完整粒子链（承接 S9） */
  const chainA = useMemo<Pt[]>(
    () =>
      Array.from({ length: N }, (_, i) => {
        const t = i / (N - 1);
        return {
          x: TAIL.x + t * CHAIN_SPAN,
          y: TAIL.y + Math.sin(i * 0.045) * 7 + Math.pow(t, 1.7) * 185,
        };
      }),
    [],
  );

  /** 中态 B：水晶簇（紧凑圆盘） */
  const disc = useMemo<Pt[]>(() => {
    const r = mulberry32(55);
    return Array.from({ length: N }, () => {
      const rad = 36 * Math.sqrt(r());
      const a = r() * Math.PI * 2;
      return { x: CENTER.x + Math.cos(a) * rad, y: CENTER.y + Math.sin(a) * rad };
    });
  }, []);

  /** 终态 C：「437×」粒子字 */
  const textC = useMemo(
    () => placeCloud(CLOUDS.t437, 640, CENTER.x, CENTER.y, 0, false),
    [],
  );

  const toDisc = morph(chainA, disc, prog(frame, 16 * k, 158 * k), 9, 46, 0.5);
  const toText = morph(toDisc, textC, prog(frame, 234 * k, 106 * k), 21, 72, 0.38);
  const pts = drift(frame <= 234 * k ? toDisc : toText, frame, 3.4);

  /** 水晶辉光：聚拢时亮起、成字时退场 */
  const glow = prog(frame, 140 * k, 60 * k) * 0.85 * (1 - prog(frame, 230 * k, 70 * k));

  /** 承接镜头的鲸残影（开场淡出） */
  const whaleGhost = useMemo(
    () => placeCloud(CLOUDS.whaleLg, 760, 570, 452, 0, false),
    [],
  );
  const ghostOp = 0.4 * (1 - prog(frame, 0, 14 * k));

  const settle = outExpo(clamp01(frame / (20 * k)));
  const outOp = 1 - clamp01((frame - (dur - 12)) / 12);

  return (
    <Stage dur={dur} tone="deep" vignette rayIntensity={0.07}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${1.04 - 0.04 * settle})`,
          opacity: clamp01(frame / (14 * k)) * outOp,
        }}
      >
        <Swarm
          pts={whaleGhost}
          size={2}
          color={COLORS.ice}
          opacity={ghostOp * 0.5}
        />
        <Swarm
          pts={pts}
          size={(i) => (i % 13 === 0 ? 3.6 : 2.6)}
          color={(i) =>
            frame > 300 * k
              ? i % 6 === 0
                ? COLORS.bright
                : COLORS.brand
              : i % 13 === 0
                ? COLORS.bright
                : i % 5 === 0
                  ? COLORS.ice
                  : COLORS.mist
          }
          opacity={(i) => 0.45 + (((i * 2654435761) >>> 0) % 100) / 100 * 0.5}
        />
        <GlowOrb cx={CENTER.x} cy={CENTER.y} r={42} intensity={glow} />

        {/* kicker 顶左 */}
        <FadeText start={12 * k} style={{ position: "absolute", left: 140, top: 110 }}>
          <div style={{ ...TYPO.kickerEN }}>COMPRESSION · 压缩</div>
        </FadeText>

        {/* 右侧三行计数账本 */}
        <div style={{ position: "absolute", right: 140, top: 340, textAlign: "right" }}>
          <LedgerRow k={k} start={56 * k} to={48068} label="CSA2 · 序列压缩" />
          <LedgerRow k={k} start={136 * k} to={3514} label="层级复用" />
          <LedgerRow k={k} start={216 * k} to={890} label="终值 · B / token" emphasize />
        </div>

        {/* 左下文案 */}
        <div style={{ position: "absolute", left: 140, bottom: 128 }}>
          <FadeText start={248 * k}>
            <div style={{ ...TYPO.head, fontSize: 54 }}>更少缓存，更省成本——437 倍。</div>
          </FadeText>
          <FadeText start={268 * k} style={{ marginTop: 16 }}>
            <div style={{ ...TYPO.en, fontSize: 24 }}>
              Smaller KV cache. Bigger savings. 437×.
            </div>
          </FadeText>
          <FadeText start={300 * k} style={{ marginTop: 14 }}>
            <div style={{ ...TYPO.mono, fontSize: 20 }}>
              KV CACHE · 389,120 → 890 B / token · 较初代 V1 缩小 437×
            </div>
          </FadeText>
        </div>
      </div>
    </Stage>
  );
};

const LedgerRow = ({
  k,
  start,
  to,
  label,
  emphasize = false,
}: {
  k: number;
  start: number;
  to: number;
  label: string;
  emphasize?: boolean;
}) => {
  return (
    <FadeText start={start} style={{ marginBottom: 22 }}>
      <div
        style={{
          ...TYPO.bigNum,
          fontSize: 58,
          color: emphasize ? COLORS.brand : COLORS.ice,
        }}
      >
        <Counter to={to} start={start} dur={70 * k} />
      </div>
      <div style={{ ...TYPO.mono, fontSize: 18, marginTop: 6 }}>{label}</div>
    </FadeText>
  );
};
