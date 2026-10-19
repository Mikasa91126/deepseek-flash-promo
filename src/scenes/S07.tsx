/**
 * S07 · 2025.09·Nature 封面（33s–37s · 240f）
 * 深蓝场中浮起一页象牙白卡片 → 官方鲸鱼矢量路径以 1px 描边自绘（strokeDashoffset 全长→0）
 * → draw-then-fill（fill 0→0.18 淡淡填入）→ 卡片轻晃定住。
 * 卡面：顶部细规线 + 一行 mono 小字，底部细规线（不用任何刊名/商标图形）。
 * 转场：settle（scale 1.04→1 + 淡入 · 首帧全黑）｜收尾 12f 淡出。
 * 节拍以 REF=240 为基准，k=dur/REF 缩放（60s 精剪版同组件复用）。
 */
import type { CSSProperties } from "react";
import { getLength } from "@remotion/paths";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../comps/Stage";
import { FadeText, TYPO } from "../comps/Text";
import { COLORS, FONTS } from "../theme";
import { clamp01, outExpo, prog } from "../lib/anim";

const REF = 240;

const CARD = { w: 560, h: 740, cx: 1180, cy: 430 };
const CARD_L = CARD.cx - CARD.w / 2; // 900
const CARD_T = CARD.cy - CARD.h / 2; // 60

/** 官方鲸鱼矢量（assets-src/deepseek-whale.svg，viewBox="0 0 26.634 19.6" 单条 path） */
const WHALE_D =   "M26.5174 3.39471C26.235 3.2567 26.1137 3.52006 25.9487 3.65346C25.8923 3.69659 25.8446 3.75294 25.7969 3" +
  ".80469C25.3846 4.24516 24.9027 4.53439 24.2737 4.49989C23.3536 4.44814 22.5682 4.73737 21.8735 5.44119C2" +
  "1.7258 4.57349 21.2353 4.0554 20.4889 3.72304C20.0985 3.55054 19.7034 3.37746 19.4297 3.00197C19.2388 2." +
  "73459 19.1865 2.43673 19.091 2.14289C19.0301 1.96579 18.9697 1.78466 18.7656 1.75418C18.5442 1.71968 18." +
  "4574 1.90541 18.3705 2.06067C18.0232 2.69549 17.8887 3.39471 17.9019 4.10313C17.9324 5.6965 18.6051 6.96" +
  "556 19.9421 7.86834C20.0939 7.97184 20.133 8.07535 20.0852 8.22658C19.9938 8.53766 19.8857 8.83955 19.79" +
  "03 9.15063C19.7293 9.34901 19.6384 9.39271 19.4257 9.30588C18.692 8.9994 18.0583 8.54571 17.4982 7.99772" +
  "C16.5477 7.07827 15.6881 6.06336 14.6162 5.26869C14.3644 5.08296 14.1125 4.91045 13.8521 4.746C12.7584 3" +
  ".68394 13.9952 2.81164 14.2816 2.70814C14.5812 2.60003 14.3857 2.22857 13.4179 2.23317C12.4502 2.2372 11" +
  ".5646 2.56151 10.4359 2.99335C10.2708 3.05832 10.0972 3.10547 9.91951 3.14457C8.8954 2.95022 7.83162 2.9" +
  "0709 6.72069 3.03245C4.62877 3.26533 2.95777 4.25436 1.72954 5.94261C0.254043 7.97184 -0.0932678 10.2777" +
  " 0.33167 12.6824C0.778458 15.2171 2.07225 17.3153 4.06008 18.9558C6.12152 20.6567 8.49577 21.4905 11.204" +
  "7 21.3306C12.8498 21.2358 14.6812 21.0155 16.7473 19.2669C17.2682 19.5262 17.8151 19.6297 18.7219 19.707" +
  "4C19.4205 19.7723 20.0933 19.6729 20.6143 19.5648C21.4302 19.3923 21.3739 18.6367 21.0789 18.4981C18.687" +
  "4 17.3843 19.2124 17.8374 18.7351 17.4706C19.9501 16.033 21.8063 13.4776 22.379 9.99821C22.4353 9.61409 " +
  "22.5072 9.073 22.4986 8.76192C22.494 8.57216 22.5377 8.49856 22.7545 8.47671C23.3536 8.40771 23.935 8.24" +
  "383 24.4692 7.94999C26.0188 7.10357 26.6439 5.71318 26.7911 4.04678C26.8129 3.79204 26.7865 3.52869 26.5" +
  "174 3.39471ZM13.0143 18.3946C10.6964 16.5724 9.5722 15.9726 9.10816 15.9985C8.67402 16.0244 8.75222 16.5" +
  "212 8.84768 16.8449C8.94773 17.1646 9.07768 17.3849 9.25996 17.6655C9.38589 17.8512 9.47272 18.1272 9.13" +
  "404 18.3348C8.38766 18.7965 7.08985 18.1796 7.0289 18.1491C5.51833 17.2595 4.25559 16.0853 3.36546 14.47" +
  "93C2.50581 12.9337 2.0067 11.2753 1.92447 9.50542C1.90262 9.07818 2.02855 8.92695 2.45406 8.84932C3.0141" +
  "3 8.74582 3.59144 8.72397 4.15093 8.80619C6.51656 9.15178 8.53027 10.2092 10.2185 11.8848C11.1822 12.838" +
  "8 11.9114 13.979 12.6623 15.0929C13.461 16.2757 14.3201 17.4027 15.4144 18.3268C15.8008 18.6505 16.109 1" +
  "8.8966 16.404 19.0783C15.5144 19.1778 14.0297 19.1991 13.0143 18.3958V18.3946ZM14.1252 11.2489C14.1252 1" +
  "1.0591 14.277 10.9079 14.4679 10.9079C14.511 10.9079 14.5501 10.9165 14.5852 10.9292C14.6329 10.9464 14." +
  "6766 10.9723 14.7111 11.0114C14.7721 11.0718 14.8066 11.158 14.8066 11.2489C14.8066 11.4386 14.6548 11.5" +
  "899 14.4639 11.5899C14.273 11.5899 14.1252 11.4386 14.1252 11.2489ZM17.5759 13.0188C17.3545 13.1096 17.1" +
  "331 13.1873 16.9203 13.1959C16.5903 13.2131 16.2303 13.0791 16.0348 12.9153C15.7312 12.6605 15.5139 12.5" +
  "179 15.423 12.0734C15.3839 11.8837 15.4057 11.5899 15.4402 11.4214C15.5185 11.0585 15.4316 10.8257 15.17" +
  "57 10.614C14.9676 10.4415 14.7025 10.3938 14.4115 10.3938C14.3029 10.3938 14.2034 10.3461 14.1292 10.307" +
  "6C14.0079 10.2472 13.9078 10.096 14.0033 9.91023C14.0338 9.84985 14.1815 9.70322 14.216 9.67734C14.6111 " +
  "9.45251 15.0665 9.52612 15.488 9.6946C15.8784 9.85445 16.174 10.1477 16.5989 10.5623C17.033 11.0631 17.1" +
  "112 11.2011 17.3585 11.5772C17.554 11.871 17.7317 12.1729 17.8536 12.5185C17.9272 12.7341 17.8317 12.910" +
  "7 17.5759 13.0188Z";

const WHALE_LEN = getLength(WHALE_D);
const ART = { w: 420, h: 309, left: 70, top: 216, viewBox: "0.163 1.75 26.634 19.6" };
const ART_SCALE = ART.w / 26.634;

const CN: CSSProperties = {
  fontFamily: FONTS.serifCN,
  fontWeight: 300,
  fontSize: 40,
  letterSpacing: "0.06em",
  lineHeight: 1.55,
  color: COLORS.ivory,
};

export const S07 = ({ dur }: { dur: number }) => {
  const frame = useCurrentFrame();
  const k = dur / REF;

  // settle 入场
  const inP = outExpo(clamp01(frame / (26 * k)));
  const outP = clamp01((frame - (dur - 12 * k)) / (12 * k));
  const scale = 1.04 + (1 - 1.04) * inP;

  // 卡片浮入 + 轻晃定住
  const floatP = outExpo(prog(frame, 6 * k, 42 * k));
  const cardY = (1 - floatP) * 64;
  const swayT = Math.max(0, frame - 30 * k);
  const sway =
    1.2 * Math.sin((swayT / (110 * k)) * Math.PI * 2) * Math.exp(-swayT / (78 * k));

  // 线稿自绘（60f）+ draw-then-fill
  const drawT = prog(frame, 34 * k, 60 * k);
  const drawP = drawT * drawT * (3 - 2 * drawT);
  const fillP = clamp01(prog(frame, (34 + 45) * k, 15 * k));
  const ruleB = clamp01(prog(frame, 88 * k, 34 * k));

  return (
    <Stage dur={dur} tone="deep" rays rayX={0.62} rayIntensity={0.09}>
      <AbsoluteFill
        style={{
          opacity: clamp01(frame / (10 * k)) * (1 - outP),
          transform: `scale(${scale})`,
        }}
      >
        {/* 象牙白卡片 */}
        <div
          style={{
            position: "absolute",
            left: CARD_L,
            top: CARD_T,
            width: CARD.w,
            height: CARD.h,
            borderRadius: 12,
            backgroundColor: COLORS.ivory,
            boxShadow:
              "0 40px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(10,10,10,0.08)",
            opacity: clamp01(prog(frame, 4 * k, 16 * k)),
            transform: `translateY(${cardY}px) rotate(${sway}deg)`,
          }}
        >
          {/* 卡面内框 */}
          <div
            style={{
              position: "absolute",
              inset: 24,
              border: "1px solid rgba(19,38,59,0.12)",
              borderRadius: 6,
            }}
          />

          {/* 顶部 mono 小字 + 细规线 */}
          <FadeText
            start={78 * k}
            y={6}
            dur={30 * k}
            style={{ position: "absolute", top: 80, left: 0, width: CARD.w }}
          >
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 17,
                letterSpacing: "0.22em",
                color: "rgba(19,38,59,0.62)",
                textAlign: "center",
              }}
            >
              Vol. 645 · September 2025
            </div>
          </FadeText>
          <div
            style={{
              position: "absolute",
              left: 74,
              top: 130,
              width: 412 * clamp01(prog(frame, 66 * k, 30 * k)),
              height: 1,
              backgroundColor: "rgba(19,38,59,0.26)",
            }}
          />

          {/* 官方鲸鱼线稿：自绘 + 淡淡填入 */}
          <svg
            width={ART.w}
            height={ART.h}
            viewBox={ART.viewBox}
            style={{
              position: "absolute",
              left: ART.left,
              top: ART.top,
              overflow: "visible",
            }}
          >
            <path
              d={WHALE_D}
              fill={COLORS.deep}
              fillOpacity={0.18 * fillP}
              stroke={COLORS.deep}
              strokeOpacity={0.82}
              strokeWidth={1 / ART_SCALE}
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength={WHALE_LEN}
              strokeDasharray={WHALE_LEN}
              strokeDashoffset={WHALE_LEN * (1 - drawP)}
            />
          </svg>

          {/* 底部细规线 */}
          <div
            style={{
              position: "absolute",
              left: 96,
              top: 609,
              width: 368 * ruleB,
              height: 1,
              backgroundColor: "rgba(19,38,59,0.26)",
            }}
          />
        </div>

        {/* kicker（日期行） */}
        <FadeText
          start={20 * k}
          y={10}
          dur={40 * k}
          style={{ position: "absolute", left: 140, top: 110 }}
        >
          <div style={{ ...TYPO.kickerCN }}>2025.09 · R1</div>
        </FadeText>

        {/* 主文案块（左下） */}
        <div
          style={{ position: "absolute", left: 140, bottom: 160, maxWidth: 1320 }}
        >
          <FadeText start={116 * k} y={16} dur={52 * k}>
            <div style={{ ...CN }}>
              登上《Nature》封面——首个经同行评审的主流大模型研究
            </div>
            <div style={{ ...TYPO.en, fontSize: 24, marginTop: 16 }}>
              September 2025 — R1 on the cover of Nature.
            </div>
          </FadeText>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
