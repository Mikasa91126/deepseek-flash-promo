import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { COLORS } from "./theme";
import { SCENES } from "./scenes";

/**
 * 60s 精剪版：同一套场景组件，dur ×2/3（合计恰好 3600 帧）。
 * 各场景内部节拍经 k = dur/REF 自动收缩；音轨为 tools/make_score.py 的 60s 时间轴版本。
 */
export const DURATIONS_60 = [
  200, 200, 200, 240, 240, 240, 160, 200, 240, 280, 200, 280, 240, 200, 200, 280,
];

const STARTS_60 = (() => {
  const a: number[] = [];
  let acc = 0;
  for (const d of DURATIONS_60) {
    a.push(acc);
    acc += d;
  }
  return a;
})();

export const Promo60 = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.abyss }}>
      <Audio src={staticFile("audio/mix60.wav")} />
      {SCENES.map((Comp, i) => (
        <Sequence key={i} from={STARTS_60[i]} durationInFrames={DURATIONS_60[i]}>
          <Comp dur={DURATIONS_60[i]} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
