/**
 * SceneLab —— 单镜检视台。用 props.scene 选择镜头，直接用 0 基帧渲染该镜。
 * 用法：npx remotion still SceneLab out/lab/S05-f240.png --frame=240 --props='{"scene":5}'
 */
import { SCENES } from "./scenes";
import { SCENE_DURATIONS } from "./theme";

export const SceneLab = ({ scene = 1 }: { scene?: number }) => {
  const idx = Math.min(Math.max(scene, 1), SCENES.length) - 1;
  const Comp = SCENES[idx];
  return <Comp dur={SCENE_DURATIONS[idx]} />;
};
