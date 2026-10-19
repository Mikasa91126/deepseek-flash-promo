import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { COLORS, SCENE_DURATIONS, sceneStart } from "./theme";
import { SCENES } from "./scenes";

/**
 * 主片总装：16 镜按 SCENE_DURATIONS 无缝排布（5400 帧 @60fps = 90.0s）。
 * 音轨：public/audio/mix90.wav（由 tools/make_score.py 生成）。
 * 转场语法由各镜首尾帧自行处理（slide / rise / settle），镜与镜之间不重叠。
 */
export const Promo = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.abyss }}>
      <Audio src={staticFile("audio/mix90.wav")} />
      {SCENES.map((Comp, i) => (
        <Sequence
          key={i}
          from={sceneStart(i + 1)}
          durationInFrames={SCENE_DURATIONS[i]}
        >
          <Comp dur={SCENE_DURATIONS[i]} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
