import type { FC } from "react";
import { S01 } from "./S01";
import { S02 } from "./S02";
import { S03 } from "./S03";
import { S04 } from "./S04";
import { S05 } from "./S05";
import { S06 } from "./S06";
import { S07 } from "./S07";
import { S08 } from "./S08";
import { S09 } from "./S09";
import { S10 } from "./S10";
import { S11 } from "./S11";
import { S12 } from "./S12";
import { S13 } from "./S13";
import { S14 } from "./S14";
import { S15 } from "./S15";
import { S16 } from "./S16";

/** 16 镜，顺序 = 时间线顺序；每镜接收自身时长 dur（帧），帧号在镜内从 0 起 */
export const SCENES: FC<{ dur: number }>[] = [
  S01, S02, S03, S04, S05, S06, S07, S08,
  S09, S10, S11, S12, S13, S14, S15, S16,
];
