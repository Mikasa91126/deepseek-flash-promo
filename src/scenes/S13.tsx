/**
 * S13 · 非对称·架构之美（1:07–1:13 · 360f）
 *
 * 巨鲸剖面视图：鲸身以暗蓝底影呈现，体内 16 个「专家」光点自 40 帧起
 * 以 pow(i,0.8) 错落逐一点亮；左上 CED 两段各 20 层光轨（prefill / decode）；
 * 右上远景 196B Engram 记忆星云（80 微点慢漂）。
 *
 * 转场：自右滑入（translateX 140 → 0，26f）；结尾 12f 淡出（接 S14 vertical rise）。
 * 节奏：镜内一切节拍以 90s 基准（REF）书写，按 k = dur / REF 缩放（60s 精剪复用）。
 */
import { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { Swarm } from "../comps/Swarm";
import { GlowOrb } from "../comps/fx";
import { FadeText, TYPO } from "../comps/Text";
import { CLOUDS, drift, placeCloud, type Pt } from "../lib/swarm";
import { COLORS, EASE, FONTS } from "../theme";
import { breathe, clamp01, mulberry32, outExpo, stagger } from "../lib/anim";

const REF = 360;

const N_EXPERT = 16;
const CED_N = 20;
const CED_SEG_W = 20;
const CED_GAP = 5;
const CED_X = 140;

const EXPERT_START = 40;

/** 专家光点：从已布局鲸点云中分层采样（保证落在鲸身内部，且分布均匀） */
const sampleExperts = (shell: Pt[]): Pt[] => {
  const r = mulberry32(1313);
  const n = shell.length;
  const out: Pt[] = [];
  for (let i = 0; i < N_EXPERT; i++) {
    const lo = Math.floor((i / N_EXPERT) * n);
    const hi = Math.max(lo + 1, Math.floor(((i + 1) / N_EXPERT) * n));
    out.push(shell[Math.min(n - 1, lo + Math.floor(r() * (hi - lo)))]);
  }
  return out;
};

/* ------------------------------------------------------------ 专家光点 */

const ExpertLight = ({
  p,
  i,
  f,
  frame,
}: {
  p: Pt;
  i: number;
  /** 节拍帧（90s 基准） */
  f: number;
  /** 真实帧（物理微动效用） */
  frame: number;
}) => {
  const t0 = EXPERT_START + stagger(i, 120);
  const age = f - t0;
  if (age < -1) return null;
  const on = clamp01(age / 9); // 透明度先到（~0.15s）
  const flash = age > 0 ? Math.exp(-age / 15) : 0; // 点亮瞬间的脉冲衰减
  const jitter = age >= 0 && age < 3 ? (((i * 7) % 3) - 1) * 1.4 : 0; // 1–2 帧 jitter
  const r = 6.2 * (0.82 + ((i * 37) % 10) * 0.036) * (1 + 0.45 * flash);
  const glow = on * (0.7 + 0.3 * breathe(frame, 300, i * 1.9));
  const pingR = age >= 0 && age < 30 ? 7 + 30 * outExpo(clamp01(age / 30)) : 0;
  return (
    <>
      {pingR > 0 ? (
        <div
          style={{
            position: "absolute",
            left: p.x + jitter - pingR,
            top: p.y + jitter - pingR,
            width: pingR * 2,
            height: pingR * 2,
            borderRadius: "50%",
            border: `1px solid ${COLORS.bright}`,
            opacity: 0.5 * (1 - clamp01(age / 30)),
            pointerEvents: "none",
          }}
        />
      ) : null}
      <GlowOrb
        cx={p.x + jitter}
        cy={p.y + jitter}
        r={r}
        intensity={glow}
        color={COLORS.bright}
      />
    </>
  );
};

/* ------------------------------------------------------- CED 光轨一节 */

const CedSeg = ({
  x,
  y,
  t0,
  f,
  frame,
  color,
  rest,
}: {
  x: number;
  y: number;
  /** 点亮节拍帧（90s 基准） */
  t0: number;
  f: number;
  frame: number;
  color: string;
  rest: number;
}) => {
  const age = f - t0;
  if (age < 0) return null;
  const e = outExpo(clamp01(age / 9));
  const flash = Math.exp(-age / 24);
  const shimmer = 0.06 * Math.sin(frame / 26 - x / 40);
  const op = clamp01(rest + 0.4 * flash + shimmer) * clamp01(age / 3);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: CED_SEG_W * e,
        height: 13,
        borderRadius: 2,
        backgroundColor: color,
        opacity: op,
      }}
    />
  );
};

/* ---------------------------------------------------------------- S13 */

export const S13 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;
  /** 节拍帧：90s 基准时间轴（物理微动效仍用真实 frame，不缩放） */
  const f = frame / k;

  /* 转场：自右滑入 140 → 0（26f）；结尾 12f 淡出 */
  const slideP = interpolate(f, [0, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.outExpo,
  });
  const slideX = (1 - slideP) * 140;
  const op = clamp01(f / 12) * (1 - clamp01((f - (REF - 12)) / 12));

  /* 鲸身：1200 宽，中心 (960, 430) */
  const shell = useMemo(() => placeCloud(CLOUDS.whaleLg, 1200, 960, 430), []);
  const shellAlive = useMemo(() => drift(shell, frame, 3.2, 0.55), [shell, frame]);
  const experts = useMemo(() => sampleExperts(shell), [shell]);

  /* 右上远景星云：80 微点，椭圆分布，慢漂 */
  const nebula = useMemo(() => {
    const r = mulberry32(20260910);
    return Array.from({ length: 80 }, () => {
      const a = r() * Math.PI * 2;
      const rad = Math.sqrt(r());
      return {
        x: 1662 + Math.cos(a) * rad * 208,
        y: 272 + Math.sin(a) * rad * 138,
      };
    });
  }, []);
  const nebulaAlive = useMemo(() => drift(nebula, frame, 7, 0.4), [nebula, frame]);

  /* CED 两条光轨：第一排 prefill 先走完，第二排 decode 随后 */
  const cedRows = [
    { y: 250, color: COLORS.bright, base: 62, rest: 0.82, label: "prefill · 8B" },
    {
      y: 296,
      color: COLORS.ice,
      base: 62 + CED_N * 2.6 + 8,
      rest: 0.5,
      label: "decode · 16B",
    },
  ];

  const cnLine1 = "非对称模型结构，小成本大智能——552B MoE 主干 · 196B Engram ·";
  const cnLine2 = "每 token 激活 8B / 16B · CED 20+20 层";

  const cnStyle = {
    fontFamily: FONTS.serifCN,
    fontWeight: 300,
    fontSize: 36,
    letterSpacing: "0.03em",
    lineHeight: 1.55,
    color: COLORS.ivory,
  } as const;

  return (
    <Stage dur={dur} tone="abyss" rays rayX={0.68} rayIntensity={0.09}>
      <AbsoluteFill
        style={{ opacity: op, transform: `translateX(${slideX}px)` }}
      >
        {/* ---------- 远景星云（196B Engram） ---------- */}
        <div
          style={{
            position: "absolute",
            left: 1440,
            top: 60,
            width: 450,
            height: 430,
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, #1B3557 0%, rgba(19,38,59,0.35) 46%, rgba(10,10,10,0) 72%)`,
            filter: "blur(22px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 1552,
            top: 144,
            width: 280,
            height: 260,
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, #23456F 0%, rgba(19,38,59,0.3) 48%, rgba(10,10,10,0) 74%)`,
            filter: "blur(16px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: clamp01((f - 26) / 40),
          }}
        >
          <Swarm
            pts={nebulaAlive}
            size={(i) => 1 + (i % 3) * 0.7}
            color={(i) => (i % 5 === 0 ? COLORS.ice : COLORS.bright)}
            opacity={(i) => 0.26 + (i % 4) * 0.13}
            blur={0.7}
          />
        </div>
        <FadeText
          start={58 * k}
          y={10}
          style={{ position: "absolute", left: 1500, top: 448, width: 330 }}
        >
          <div
            style={{
              fontFamily: FONTS.sansCN,
              fontWeight: 400,
              fontSize: 21,
              letterSpacing: "0.2em",
              color: "rgba(156,193,231,0.5)",
            }}
          >
            记忆星云
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: FONTS.mono,
              fontSize: 27,
              letterSpacing: "0.06em",
              color: COLORS.ice,
            }}
          >
            196B Engram
          </div>
        </FadeText>

        {/* ---------- 鲸身剖面底影（暗色体块 + 稀疏亮点勾边） ---------- */}
        <div style={{ opacity: clamp01((f - 4) / 26) }}>
          {/* 体块：连成一片的暗蓝剪影（剖面主体，鲸形可读） */}
          <Swarm
            pts={shellAlive}
            size={4.6}
            color={COLORS.bright}
            opacity={(i) => 0.2 + (i % 4) * 0.022}
            blur={1}
          />
          {/* 外缘微亮：让轮廓从背景里浮出来 */}
          <Swarm
            pts={shellAlive}
            size={2.1}
            color={COLORS.ice}
            opacity={(i) => (i % 5 === 0 ? 0.3 : 0.07)}
            blur={0.5}
          />
        </div>

        {/* ---------- 16 个专家光点 ---------- */}
        {experts.map((p, i) => (
          <ExpertLight key={i} p={p} i={i} f={f} frame={frame} />
        ))}

        {/* ---------- 552B MoE 主干 引线标注 ---------- */}
        <FadeText
          start={96 * k}
          y={12}
          style={{ position: "absolute", left: 140, top: 496 }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 25,
                letterSpacing: "0.05em",
                color: COLORS.bright,
              }}
            >
              552B MoE
            </span>
            <span
              style={{
                fontFamily: FONTS.sansCN,
                fontSize: 19,
                letterSpacing: "0.16em",
                color: "rgba(156,193,231,0.62)",
              }}
            >
              主干
            </span>
          </div>
          <div
            style={{
              marginTop: 14,
              width: 330,
              height: 1,
              backgroundColor: "rgba(103,153,254,0.5)",
            }}
          />
          <div
            style={{
              marginTop: -3,
              marginLeft: 328,
              width: 5,
              height: 5,
              borderRadius: "50%",
              backgroundColor: COLORS.bright,
            }}
          />
        </FadeText>

        {/* ---------- CED 两段各 20 层光轨 ---------- */}
        <FadeText
          start={30 * k}
          y={12}
          style={{ position: "absolute", left: CED_X, top: 200 }}
        >
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 23,
              letterSpacing: "0.14em",
              color: COLORS.ice,
            }}
          >
            CED · 20 + 20
          </div>
        </FadeText>
        {cedRows.map((row, ri) => (
          <div key={ri}>
            {Array.from({ length: CED_N }, (_, j) => (
              <CedSeg
                key={j}
                x={CED_X + j * (CED_SEG_W + CED_GAP)}
                y={row.y}
                t0={row.base + j * 2.6}
                f={f}
                frame={frame}
                color={row.color}
                rest={row.rest}
              />
            ))}
            <FadeText
              start={(row.base + 14) * k}
              y={8}
              style={{
                position: "absolute",
                left: CED_X + CED_N * (CED_SEG_W + CED_GAP) + 22,
                top: row.y - 3,
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 21,
                  letterSpacing: "0.08em",
                  color: ri === 0 ? COLORS.bright : "rgba(156,193,231,0.72)",
                }}
              >
                {row.label}
              </div>
            </FadeText>
          </div>
        ))}

        {/* ---------- kicker ---------- */}
        <FadeText
          start={16 * k}
          style={{ position: "absolute", left: 140, top: 110 }}
        >
          <div style={{ ...TYPO.kickerCN }}>架构 · 非对称</div>
          <div style={{ ...TYPO.kickerEN, marginTop: 12, opacity: 0.75 }}>
            asymmetric architecture
          </div>
        </FadeText>

        {/* ---------- 主文案块 ---------- */}
        <FadeText
          start={70 * k}
          y={14}
          style={{
            position: "absolute",
            left: 142,
            top: 748,
            maxWidth: 1300,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.slogan,
              fontWeight: 500,
              fontSize: 26,
              letterSpacing: "-0.01em",
              lineHeight: 1.5,
              color: COLORS.ice,
            }}
          >
            Asymmetric architecture. More intelligence, less cost.
          </div>
        </FadeText>
        <FadeText
          start={52 * k}
          y={16}
          style={{
            position: "absolute",
            left: 140,
            top: 806,
            maxWidth: 1300,
          }}
        >
          <div style={cnStyle}>{cnLine1}</div>
          <div style={cnStyle}>{cnLine2}</div>
        </FadeText>
      </AbsoluteFill>
    </Stage>
  );
};
