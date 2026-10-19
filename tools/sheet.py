#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""sheet.py — 检查用拼图大表生成器。

用法 A（图片列表）:
  python tools/sheet.py out/sheet.png 4x2 S01=out/lab/S01-f295.png S02=out/lab/S02-f200.png ...

用法 B（从视频按时距抽帧）:
  python tools/sheet.py out/sheet.png 6x3 --video out/deepseek-v4.1-flash.mp4 --every 5

标签使用微软雅黑；每格按网格自适应缩放。
"""
import io
import subprocess
import sys

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FONT = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 20)


def frame_at(video: str, t: float) -> Image.Image:
    cmd = [
        FFMPEG, "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1",
        "-f", "image2pipe", "-vcodec", "png", "-",
    ]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0 or not r.stdout:
        raise RuntimeError(f"ffmpeg failed at {t}s: {r.stderr[-300:]}")
    return Image.open(io.BytesIO(r.stdout)).convert("RGB")


def video_duration(video: str) -> float:
    r = subprocess.run(
        [FFMPEG, "-i", video, "-f", "null", "-"],
        capture_output=True, text=True, errors="ignore",
    )
    for line in r.stderr.splitlines():
        if "Duration:" in line:
            hms = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = hms.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    raise RuntimeError("duration not found")


def main() -> None:
    out = sys.argv[1]
    cols, rows = (int(x) for x in sys.argv[2].split("x"))
    items: list[tuple[str, str]] = []  # (label, image_path)
    if "--video" in sys.argv:
        i = sys.argv.index("--video")
        video = sys.argv[i + 1]
        every = float(sys.argv[sys.argv.index("--every") + 1])
        dur = video_duration(video)
        t = 0.0
        n = 0
        tmp_dir = out.replace(".png", "_frames")
        import os
        os.makedirs(tmp_dir, exist_ok=True)
        while t < dur and n < cols * rows:
            p = f"{tmp_dir}/t{int(t * 10):05d}.png"
            frame_at(video, t).save(p)
            items.append((f"{t:g}s", p))
            t += every
            n += 1
    else:
        for arg in sys.argv[3:]:
            label, path = arg.split("=", 1)
            items.append((label, path))

    cell_w = 1880 // cols
    cell_h = int(cell_w * 9 / 16)
    sheet = Image.new("RGB", (cols * cell_w + 8, rows * (cell_h + 34) + 8), (16, 16, 16))
    dr = ImageDraw.Draw(sheet)
    for idx, (label, path) in enumerate(items[: cols * rows]):
        im = Image.open(path).convert("RGB")
        im.thumbnail((cell_w - 8, cell_h - 8))
        cx = (idx % cols) * cell_w + 6
        cy = (idx // cols) * (cell_h + 34) + 6
        sheet.paste(im, (cx + (cell_w - im.width) // 2, cy))
        dr.text((cx + 4, cy + cell_h - 6), label, font=FONT, fill=(200, 210, 230))
    sheet.save(out)
    print(f"sheet -> {out}  ({len(items)} cells)")


if __name__ == "__main__":
    main()
