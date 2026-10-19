#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
make_points.py — 离线点云生成器（确定性）

从官方 SVG（DeepSeek 鲸鱼 icon / DeepSeek wordmark）与字体文本生成点云 JSON，
供 Remotion 粒子动效（S12/S13/S16 等）使用。

输出:
  src/assets/points/*.json      —— {w,h,minx,miny,maxx,maxy,pts:[[x,y],...]}（原坐标系，y 向下）
  out/style/points-preview.png  —— 全部点云的可视化预览（供人工检查）

用法: python tools/make_points.py
"""
import json
import math
import os
import random
import re

from PIL import Image, ImageDraw, ImageFont

ROOT = r"B:\deepseek-flash-promo"
SRC = os.path.join(ROOT, "assets-src")
OUT = os.path.join(ROOT, "src", "assets", "points")
PREV = os.path.join(ROOT, "out", "style")
FONTS = os.path.join(ROOT, "public", "fonts")
os.makedirs(OUT, exist_ok=True)
os.makedirs(PREV, exist_ok=True)

# ---------------------------------------------------------------- path 解析

TOK_RE = re.compile(r"[MLHVCZmlhvcz]|-?\d*\.?\d+")


def flatten_path(d, seg=16):
    """把 SVG path（M/L/H/V/C/Z，绝对坐标为主）压平为多边形列表。"""
    toks = TOK_RE.findall(d)
    polys, cur = [], []
    i, cmd, x, y, start = 0, None, 0.0, 0.0, (0.0, 0.0)

    def num():
        nonlocal i
        v = float(toks[i])
        i += 1
        return v

    while i < len(toks):
        t = toks[i]
        if t in "MLHVCZmlhvcz":
            cmd = t
            i += 1
            if cmd in "Zz" and cur:
                cur.append(start)
                polys.append(cur)
                cur = []
            continue
        if cmd in "Mm":
            nx, ny = num(), num()
            if cur:
                cur.append(start)
                polys.append(cur)
            x, y = nx, ny
            start = (x, y)
            cur = [(x, y)]
            cmd = "L" if cmd == "M" else "l"
        elif cmd in "Ll":
            x, y = num(), num()
            cur.append((x, y))
        elif cmd in "Hh":
            x = num()
            cur.append((x, y))
        elif cmd in "Vv":
            y = num()
            cur.append((x, y))
        elif cmd in "Cc":
            x1, y1, x2, y2, nx, ny = (num(), num(), num(), num(), num(), num())
            px, py = cur[-1]
            for k in range(1, seg + 1):
                tt = k / seg
                mt = 1 - tt
                bx = mt**3 * px + 3 * mt * mt * tt * x1 + 3 * mt * tt * tt * x2 + tt**3 * nx
                by = mt**3 * py + 3 * mt * mt * tt * y1 + 3 * mt * tt * tt * y2 + tt**3 * ny
                cur.append((bx, by))
            x, y = nx, ny
    if cur:
        cur.append(start)
        polys.append(cur)
    return [p for p in polys if len(p) >= 3]


def inside(polys, px, py):
    c = 0
    for poly in polys:
        for k in range(len(poly) - 1):
            x1, y1 = poly[k]
            x2, y2 = poly[k + 1]
            if (y1 > py) != (y2 > py):
                xint = x1 + (py - y1) * (x2 - x1) / (y2 - y1)
                if px < xint:
                    c += 1
    return c % 2 == 1


def cloud_from_polys(polys, n, seed, outline_ratio=0.30):
    """even-odd 填充采样：30% 沿轮廓弧长均匀、70% 面积内拒绝采样。"""
    rnd = random.Random(seed)
    edges, total = [], 0.0
    for pl in polys:
        for k in range(len(pl) - 1):
            a, b = pl[k], pl[k + 1]
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            if L > 0:
                edges.append((a, b, L))
                total += L
    xs = [p[0] for pl in polys for p in pl]
    ys = [p[1] for pl in polys for p in pl]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)

    pts = []
    for _ in range(int(n * outline_ratio)):
        l = rnd.random() * total
        for a, b, L in edges:
            if l <= L:
                t = l / L
                pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
                break
            l -= L
    tries = 0
    while len(pts) < n and tries < n * 400:
        tries += 1
        px = x0 + rnd.random() * (x1 - x0)
        py = y0 + rnd.random() * (y1 - y0)
        if inside(polys, px, py):
            pts.append((px, py))
    return pts


def cloud_from_text(text, font_path, size, n, seed, variation=None):
    """渲染文本到灰度图，从字形像素中均匀采样。返回 (pts, w, h)。"""
    font = ImageFont.truetype(font_path, size)
    if variation:
        try:
            font.set_variation_by_name(variation)
        except Exception as e:  # noqa: BLE001
            print(f"  [warn] variation {variation} unavailable: {e}")
    probe = Image.new("L", (8, 8))
    pd = ImageDraw.Draw(probe)
    bb = pd.textbbox((0, 0), text, font=font)
    pad = 12
    w = bb[2] - bb[0] + pad * 2
    h = bb[3] - bb[1] + pad * 2
    img = Image.new("L", (w, h), 0)
    ImageDraw.Draw(img).text((pad - bb[0], pad - bb[1]), text, font=font, fill=255)
    px = img.load()
    pixels = [(x + 0.5, y + 0.5) for y in range(h) for x in range(w) if px[x, y] > 128]
    rnd = random.Random(seed)
    if len(pixels) <= n:
        pts = pixels
    else:
        pts = rnd.sample(pixels, n)
    return pts, w, h


def save_cloud(name, pts, meta_w=None, meta_h=None):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    data = {
        "w": round(meta_w if meta_w is not None else max(xs), 3),
        "h": round(meta_h if meta_h is not None else max(ys), 3),
        "minx": round(min(xs), 3),
        "miny": round(min(ys), 3),
        "maxx": round(max(xs), 3),
        "maxy": round(max(ys), 3),
        "pts": [[round(p[0], 2), round(p[1], 2)] for p in pts],
    }
    path = os.path.join(OUT, name + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  saved {path}  ({len(pts)} pts, {os.path.getsize(path)} bytes)")
    return data


# ---------------------------------------------------------------- 构建

def main():
    print("== whale (official icon path) ==")
    whale_svg = open(os.path.join(SRC, "deepseek-whale.svg"), encoding="utf-8").read()
    whale_d = re.findall(r'd="([^"]+)"', whale_svg)[0]
    whale_polys = flatten_path(whale_d)
    whale_pts_lg = cloud_from_polys(whale_polys, 1500, seed=11)
    whale_pts_md = cloud_from_polys(whale_polys, 480, seed=12)
    whale_pts_sm = cloud_from_polys(whale_polys, 150, seed=13)
    wlg = save_cloud("whale-lg", whale_pts_lg)
    save_cloud("whale-md", whale_pts_md)
    save_cloud("whale-sm", whale_pts_sm)

    print("== wordmark (official letter paths) ==")
    logo_svg = open(os.path.join(SRC, "deepseek-logo-brandblue.svg"), encoding="utf-8").read()
    ds = re.findall(r'd="([^"]+)"', logo_svg)
    letters = [d for d in ds if d.startswith("M") and not d.startswith("M26.5174 3.39471")]
    word_polys = []
    for d in letters:
        word_polys.extend(flatten_path(d, seg=10))
    word_pts = cloud_from_polys(word_polys, 1100, seed=21, outline_ratio=0.22)
    save_cloud("wordmark", word_pts, meta_w=143.0, meta_h=23.0)

    print("== text: V4.1 Flash ==")
    pts, w, h = cloud_from_text(
        "V4.1 Flash", os.path.join(FONTS, "Montserrat.ttf"), 200, 950, seed=31,
        variation="SemiBold",
    )
    save_cloud("t-v41flash", pts, meta_w=w, meta_h=h)

    print("== text: 437x ==")
    pts, w, h = cloud_from_text(
        "437×", os.path.join(FONTS, "Montserrat.ttf"), 220, 700, seed=32,
        variation="Bold",
    )
    save_cloud("t-437", pts, meta_w=w, meta_h=h)

    print("== text: 1M ==")
    pts, w, h = cloud_from_text(
        "1M", os.path.join(FONTS, "Montserrat.ttf"), 220, 520, seed=33,
        variation="SemiBold",
    )
    save_cloud("t-1m", pts, meta_w=w, meta_h=h)

    # ------------------------------------------------------------ preview
    print("== preview ==")
    W, H = 1680, 1180
    sheet = Image.new("RGB", (W, H), (10, 10, 10))
    dr = ImageDraw.Draw(sheet)

    def draw_cloud(data, box, color, label):
        bx, by, bw, bh = box
        minx, miny, maxx, maxy = data["minx"], data["miny"], data["maxx"], data["maxy"]
        cw, ch = maxx - minx, maxy - miny
        s = min(bw / cw, bh / ch) * 0.92
        ox = bx + (bw - cw * s) / 2 - minx * s
        oy = by + (bh - ch * s) / 2 - miny * s
        for x, y in data["pts"]:
            px, py = ox + x * s, oy + y * s
            dr.rectangle([px, py, px + 1.6, py + 1.6], fill=color)
        dr.text((bx + 8, by + 6), label, fill=(150, 160, 190))

    whale_lg = json.load(open(os.path.join(OUT, "whale-lg.json"), encoding="utf-8"))
    word = json.load(open(os.path.join(OUT, "wordmark.json"), encoding="utf-8"))
    t1 = json.load(open(os.path.join(OUT, "t-v41flash.json"), encoding="utf-8"))
    t2 = json.load(open(os.path.join(OUT, "t-437.json"), encoding="utf-8"))
    t3 = json.load(open(os.path.join(OUT, "t-1m.json"), encoding="utf-8"))

    draw_cloud(whale_lg, (40, 40, 760, 520), (77, 107, 254), "whale-lg 1500")
    draw_cloud(word, (860, 40, 780, 200), (249, 248, 248), "wordmark 1100")
    draw_cloud(t1, (860, 280, 780, 280), (156, 193, 231), "t-v41flash 950")
    draw_cloud(t2, (40, 620, 500, 260), (77, 107, 254), "t-437 700")
    draw_cloud(t3, (600, 620, 340, 260), (175, 211, 220), "t-1m 520")
    # whale 小尺寸对比
    wsm = json.load(open(os.path.join(OUT, "whale-sm.json"), encoding="utf-8"))
    draw_cloud(wsm, (40, 920, 260, 200), (103, 153, 254), "whale-sm 150")
    wmd = json.load(open(os.path.join(OUT, "whale-md.json"), encoding="utf-8"))
    draw_cloud(wmd, (380, 920, 380, 200), (156, 193, 231), "whale-md 480")

    out_png = os.path.join(PREV, "points-preview.png")
    sheet.save(out_png)
    print(f"preview -> {out_png}")


if __name__ == "__main__":
    main()
