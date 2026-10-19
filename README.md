# DeepSeek V4.1 Flash · 概念宣传片（Remotion 工程）

> 90s 主片 + 60s 精剪 · 1920×1080 · 60fps · 中文主文案 + 英文点缀 · 程序合成配乐
> 定位：官方风格致敬的概念片（非官方出品）

## 快速开始

```bash
cd B:/deepseek-flash-promo
npm run dev                    # 预览工作室（含 Promo / Promo60 / StyleLab / SceneLab）
npm run render                 # 渲染 90s 主片 → out/deepseek-v4.1-flash.mp4
npm run render:hw              # 同上（尝试 NVENC 硬件加速）
npx remotion render Promo60 out/deepseek-v4.1-flash-60s.mp4
npx remotion still SceneLab out/lab/S05-f060.png --frame=60 --props='{"scene":5}'
```

## 结构

```
DESIGN.md            设计规范（故事线/色板/动效参数/分镜表/上屏数字白名单与禁用清单）
src/theme.ts         色板 / 字体 / 缓动 / 16 镜时长表（5400 帧 = 90.0s）
src/lib/             粒子群引擎（官方鲸形/字标注/文字点云）、动效工具、字体注册
src/comps/           Stage 舞台 / Swarm 粒子渲染 / 字幕系统 / 计数器 / 氛围特效
src/scenes/S01-16    16 个镜头（接收 dur，内部节拍以 k = dur/REF 自适应 60s 版）
src/Promo.tsx        90s 总装（音轨 audio/mix90.wav）
src/Promo60.tsx      60s 精剪（音轨 audio/mix60.wav）
tools/make_points.py 离线点云生成（官方 SVG → 粒子坐标，产出 src/assets/points/*.json）
tools/sheet.py       检查用拼图大表生成器
tools/make_score.py  配乐生成脚本（纯 numpy/scipy 合成，产出 public/audio/*.wav）
assets-src/          官方素材源（鲸鱼 icon / wordmark SVG，取自 deepseek.com 公开资产）
```

## 事实纪律

上屏数字与文案全部来自 DESIGN.md §6 白名单（含来源）；禁用清单（编造速度数据、二创形象、「V4 Pro 下线」叙事等）已在设计阶段排除。
