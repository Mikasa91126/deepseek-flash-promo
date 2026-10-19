import { Composition } from "remotion";
import "./lib/fonts";
import { Promo } from "./Promo";
import { Promo60 } from "./Promo60";
import { SceneLab } from "./SceneLab";
import { StyleLab } from "./StyleLab";
import { DURATION_IN_FRAMES, FPS } from "./theme";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="Promo"
        component={Promo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Promo60"
        component={Promo60}
        durationInFrames={3600}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="StyleLab"
        component={StyleLab}
        durationInFrames={600}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="SceneLab"
        component={SceneLab}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ scene: 1 }}
      />
    </>
  );
};
