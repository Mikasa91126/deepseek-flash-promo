/**
 * S15 · 普惠·象牙白价格卡（1:18–1:23 · 300f）
 *
 * 全片唯一大亮场：象牙白卡片版面（96px 边距规整网格 + 1px 淡规线），
 * 三格价格 ¥0.02 / ¥1 / ¥4 逐格延迟滚动落定；右下 MIT 徽记 1px 自绘；
 * 结尾一道斜向光扫过卡面，同时整卡淡出回深色。
 *
 * 转场：settle 跨色调（深色 → 象牙白，scale 1.04 → 1 + 淡入）。
 * 节奏：镜内一切节拍以 90s 基准（REF）书写，按 k = dur / REF 缩放（60s 精剪复用）。
 */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { Counter } from "../comps/Counter";
import { FadeText } from "../comps/Text";
import { COLORS, FONTS } from "../theme";
import { clamp01, outExpo } from "../lib/anim";

const REF = 300;

const INK = "rgba(10,10,10,0.88)";
const RULE = "rgba(10,10,10,0.12)";
const BLOCK_L = 96;
const BLOCK_R = 1824;
const BLOCK_T = 300;
const BLOCK_B = 700;
const COL_W = (BLOCK_R - BLOCK_L) / 3; // 576
const COL_RIGHT = [BLOCK_L + COL_W, BLOCK_L + COL_W * 2, BLOCK_R];

const CELLS = [
  { to: 0.02, decimals: 2, label: "缓存命中" },
  { to: 1, decimals: 0, label: "未命中" },
  { to: 4, decimals: 0, label: "输出" },
];

const numStyle = {
  fontFamily: FONTS.mono,
  fontSize: 96,
  letterSpacing: "-0.01em",
  color: COLORS.abyss,
  lineHeight: 1,
} as const;

/** kicker：象牙白底上用品牌蓝（亮蓝 #6799FE 在象牙白上对比不足） */
const KICKER = {
  fontFamily: FONTS.sansCN,
  fontWeight: 500,
  fontSize: 30,
  letterSpacing: "0.38em",
  color: COLORS.brand,
} as const;

/* MIT 徽记：1px 圆角矩形描边自绘 + mono 字 + 细下划线 */
const MitBadge = ({ f }: { f: number }) => {
  const W = 132;
  const H = 52;
  const R = 10;
  const per = 2 * (W + H) - 8 * R + 2 * Math.PI * R;
  const draw = outExpo(clamp01((f - 200) / 46));
  const op = clamp01((f - 200) / 12);
  const txt = clamp01((f - 220) / 14);
  const ul = outExpo(clamp01((f - 234) / 26));
  return (
    <div style={{ position: "absolute", left: 1648, top: 840, width: W, height: H }}>
      <svg
        width={W}
        height={H}
        style={{ position: "absolute", left: 0, top: 0, opacity: op }}
      >
        <rect
          x={0.5}
          y={0.5}
          width={W - 1}
          height={H - 1}
          rx={R}
          ry={R}
          fill="none"
          stroke={COLORS.abyss}
          strokeOpacity={0.55}
          strokeWidth={1}
          strokeDasharray={per}
          strokeDashoffset={per * (1 - draw)}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          opacity: txt,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 25,
            letterSpacing: "0.14em",
            color: INK,
            paddingLeft: "0.14em",
            lineHeight: 1,
          }}
        >
          MIT
        </div>
        <div
          style={{
            width: 54 * ul,
            height: 1,
            backgroundColor: "rgba(10,10,10,0.45)",
          }}
        />
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------- S15 */

export const S15 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;
  /** 节拍帧：90s 基准时间轴（物理微动效仍用真实 frame，不缩放） */
  const f = frame / k;

  /* 跨色调 settle 入场：象牙白卡片 scale 1.04 → 1 + 淡入 */
  const enterScale = 1.04 - 0.04 * outExpo(clamp01(f / 22));
  const op = clamp01(f / 10);

  /* 结尾：光扫 + 整卡淡出回深色（最后 9 帧基准） */
  const sweepP = (f - (REF - 16)) / 14;
  const darkOp = clamp01((f - (REF - 9)) / 9);

  /* 规线：宽度展开 */
  const ruleW = outExpo(clamp01((f - 24) / 52));
  const vRuleOp = clamp01((f - 46) / 30);

  return (
    <Stage dur={dur} tone="ivory" vignette={false}>
      <AbsoluteFill style={{ opacity: op, transform: `scale(${enterScale})` }}>
        {/* ---------- 96px 边距规整网格 ---------- */}
        <div
          style={{
            position: "absolute",
            left: BLOCK_L,
            top: BLOCK_T,
            width: (BLOCK_R - BLOCK_L) * ruleW,
            height: 1,
            backgroundColor: RULE,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: BLOCK_L,
            top: BLOCK_B,
            width: (BLOCK_R - BLOCK_L) * ruleW,
            height: 1,
            backgroundColor: RULE,
          }}
        />
        {[COL_W, COL_W * 2].map((cx, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: BLOCK_L + cx,
              top: BLOCK_T - 8,
              width: 1,
              height: BLOCK_B - BLOCK_T + 16,
              backgroundColor: "rgba(10,10,10,0.09)",
              opacity: vRuleOp,
            }}
          />
        ))}
        <FadeText
          start={36 * k}
          y={8}
          style={{
            position: "absolute",
            left: BLOCK_L,
            top: BLOCK_T - 42,
            width: BLOCK_R - BLOCK_L,
            textAlign: "right",
          }}
        >
          <span
            style={{
              fontFamily: FONTS.sansCN,
              fontSize: 21,
              letterSpacing: "0.08em",
              color: "rgba(10,10,10,0.42)",
            }}
          >
            每百万 tokens
          </span>
        </FadeText>

        {/* ---------- 三格价格 ---------- */}
        {CELLS.map((c, i) => (
          <div key={i}>
            <div
              style={{
                position: "absolute",
                left: COL_RIGHT[i] - COL_W + 56,
                top: 418,
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                opacity: clamp01((f - (56 + i * 20)) / 10),
              }}
            >
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 44,
                  color: "rgba(10,10,10,0.45)",
                  lineHeight: 1,
                }}
              >
                ¥
              </span>
              <Counter
                from={0}
                to={c.to}
                start={(58 + i * 20) * k}
                dur={84 * k}
                format={c.decimals > 0 ? (v) => v.toFixed(c.decimals) : undefined}
                style={numStyle}
              />
            </div>
            <FadeText
              start={(72 + i * 20) * k}
              y={8}
              style={{
                position: "absolute",
                left: COL_RIGHT[i] - COL_W + 56,
                top: 566,
                width: COL_W - 112,
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.sansCN,
                  fontSize: 26,
                  letterSpacing: "0.08em",
                  color: "rgba(10,10,10,0.62)",
                }}
              >
                {c.label}
              </div>
            </FadeText>
          </div>
        ))}

        {/* ---------- MIT 徽记 ---------- */}
        <MitBadge f={f} />

        {/* ---------- kicker ---------- */}
        <FadeText
          start={14 * k}
          style={{ position: "absolute", left: 140, top: 110 }}
        >
          <div style={{ ...KICKER }}>普惠 · 价格</div>
          <div
            style={{
              marginTop: 12,
              fontFamily: FONTS.mono,
              fontSize: 21,
              letterSpacing: "0.22em",
              color: "rgba(10,10,10,0.45)",
            }}
          >
            pricing
          </div>
        </FadeText>

        {/* ---------- 主文案块 ---------- */}
        <FadeText
          start={62 * k}
          y={14}
          style={{ position: "absolute", left: 142, top: 748, maxWidth: 1300 }}
        >
          <div
            style={{
              fontFamily: FONTS.slogan,
              fontWeight: 500,
              fontSize: 26,
              letterSpacing: "-0.01em",
              lineHeight: 1.5,
              color: "rgba(19,38,59,0.82)",
            }}
          >
            From ¥0.02 per million tokens. Open, under MIT.
          </div>
        </FadeText>
        <FadeText
          start={44 * k}
          y={16}
          style={{ position: "absolute", left: 140, top: 806, maxWidth: 1400 }}
        >
          <div
            style={{
              fontFamily: FONTS.serifCN,
              fontWeight: 300,
              fontSize: 40,
              letterSpacing: "0.03em",
              lineHeight: 1.55,
              color: INK,
            }}
          >
            闲时 ¥0.02 / ¥1 / ¥4 每百万 tokens ｜ MIT 开源
          </div>
        </FadeText>
      </AbsoluteFill>

      {/* ---------- 结尾：斜向光扫 ---------- */}
      <div
        style={{
          position: "absolute",
          inset: -400,
          background:
            "linear-gradient(104deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.30) 46%, rgba(255,255,255,0.92) 50%, rgba(255,255,255,0.30) 54%, rgba(255,255,255,0) 60%)",
          transform: `translateX(${(sweepP * 2 - 1) * 900}px)`,
          opacity: sweepP > 0 && sweepP < 1 ? 1 : 0,
          pointerEvents: "none",
        }}
      />
      {/* ---------- 结尾：淡出回深色 ---------- */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: COLORS.abyss,
          opacity: darkOp,
          pointerEvents: "none",
        }}
      />
    </Stage>
  );
};
