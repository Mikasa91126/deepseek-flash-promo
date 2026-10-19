#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
DeepSeek V4.1 Flash 宣传片配乐 —— 独立校验脚本

只读取已落盘的 WAV 文件（不依赖 make_score 的内存状态），校验：
  · 总时长 / 采样率 / 声道 / 位深
  · 全片峰值 < 0.99 FS（防削波）
  · 音乐峰值 ≤ -3 dBFS / SFX 峰值 ≤ -8 dBFS
  · mix = music + sfx（分轨可叠加）
  · 关键 hit 对齐（±50ms）与结尾 bit-exact 静音
用法：
  python tools/check_score.py            # 90s 母版 + 60s 精剪 都查
  python tools/check_score.py --cut 60
"""
from __future__ import annotations

import argparse
import math
import os
import sys

import numpy as np
from scipy import signal as sps
from scipy.io import wavfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_score as MS                                    # 只取编排表（hit 秒表/探针频段）

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, "public", "audio")
SR = 48000
TOL_MS = 50.0


def db(x: float) -> float:
    return 20.0 * math.log10(x + 1e-12)


def band_of(x: np.ndarray, band) -> np.ndarray:
    nyq = SR / 2.0
    if isinstance(band, tuple):
        f1, f2 = band
    elif band == "lo":
        f1, f2 = 25.0, 200.0
    else:
        f1, f2 = 200.0, 9000.0
    return sps.sosfilt(sps.butter(2, [f1 / nyq, f2 / nyq], "bandpass", output="sos"), x)


def onset_time(mono: np.ndarray, t: float, band, span: float = 0.10):
    """与生成端同构的测量（另写一遍，作为第二意见）：短时 RMS 最陡上升沿。"""
    y = band_of(mono, band)
    is_lo = band == "lo"
    w = int((40.0 if is_lo else 20.0) / 1000.0 * SR)
    dl = int((40.0 if is_lo else 20.0) / 1000.0 * SR)
    hop = int(0.001 * SR)
    cs = np.concatenate([[0.0], np.cumsum(y.astype(np.float64) ** 2)])
    a = max(1, int((t - span) * SR))
    b = min(cs.size - 1 - w - 1, int((t + span) * SR))
    if b <= a + 2 * hop:
        return None, None
    ts = np.arange(a, b, hop)
    r1 = np.sqrt(np.maximum(cs[ts + w] - cs[ts], 0.0) / w)
    i2 = np.maximum(ts - dl, 0)
    r2 = np.sqrt(np.maximum(cs[i2 + w] - cs[i2], 0.0) / w)
    k = int(np.argmax(r1 - r2))
    return ts[k] / SR, db(float(np.max(r1)) / (float(np.median(r2)) + 1e-12))


def rms_db(x: np.ndarray) -> float:
    return 20.0 * math.log10(math.sqrt(float(np.mean(x.astype(np.float64) ** 2))) + 1e-12)


def check_cut(cut: int) -> bool:
    scale = 1.0 if cut == 90 else 2.0 / 3.0
    dur_exp = 90.0 * scale
    print("=" * 78)
    print(f"DeepSeek V4.1 Flash · {cut}s 配乐校验（预期 {dur_exp:.3f}s / 48kHz / 立体声 / 16-bit）")
    print("=" * 78)
    ok = True
    data = {}
    for name in ("mix", "music", "sfx"):
        p = os.path.join(AUDIO, f"{name}{cut}.wav")
        if not os.path.exists(p):
            print(f"  !! 缺失 {p}")
            return False
        sr, x = wavfile.read(p)
        dur = x.shape[0] / float(sr)
        ch = 1 if x.ndim == 1 else x.shape[1]
        data[name] = (sr, x)
        peak = float(np.max(np.abs(x.astype(np.float64)))) / 32768.0
        good = (abs(dur - dur_exp) < 1e-6) and sr == SR and ch == 2
        ok &= good
        print(f"  {name:<6} {os.path.basename(p):<12} 时长 {dur:.6f}s（{x.shape[0]} 帧）"
              f" / {sr}Hz / {ch}ch / 16-bit  峰值 {peak:.4f} FS ({db(peak):+.2f} dBFS)"
              f"  {'OK' if good else '!!'}")

    # ---- 峰值约束 ----
    sr, mix = data["mix"]
    _, mus = data["music"]
    _, sfx = data["sfx"]
    mix_f = mix.astype(np.float64) / 32768.0
    mus_f = mus.astype(np.float64) / 32768.0
    sfx_f = sfx.astype(np.float64) / 32768.0
    mp = float(np.max(np.abs(mix_f)))
    up = float(np.max(np.abs(mus_f)))
    sp = float(np.max(np.abs(sfx_f)))
    c1 = mp < 0.99
    c2 = db(up) <= -3.0
    c3 = db(sp) <= -8.0
    ok &= c1 and c2 and c3
    print(f"  全片峰值   {mp:.4f} FS（{db(mp):+.2f} dBFS）< 0.99 : {'OK' if c1 else '!! 削波风险'}")
    print(f"  音乐峰值   {db(up):+.2f} dBFS ≤ -3 dB : {'OK' if c2 else '!!'}")
    print(f"  SFX 峰值   {db(sp):+.2f} dBFS ≤ -8 dB : {'OK' if c3 else '!!'}")

    # ---- 分轨可叠加：mix == music + sfx（16-bit 量化内）----
    rec = mix.astype(np.float64) - (mus.astype(np.int32) + sfx.astype(np.int32))
    err = float(np.max(np.abs(rec))) / 32768.0
    e_ok = err <= 4.5 / 32768.0   # 三轨各自独立 TPDF 抖动 ±1 LSB
    ok &= e_ok
    print(f"  mix − (music+sfx) 最大偏差 {err * 32768:.1f} LSB（独立抖动 ±1 LSB ×3）: {'OK' if e_ok else '!!'}")

    # ---- 关键 hit 对齐 ----
    mono = 0.5 * (mix_f[:, 0] + mix_f[:, 1])
    mmono = 0.5 * (mus_f[:, 0] + mus_f[:, 1])
    print(f"  {'期望 s':>9}{'实测 s':>10}{'偏差 ms':>10}  判定  说明")
    worst = 0.0
    nbad = 0
    for t0, label, kind, band in MS.HITS:
        t = t0 * scale
        if kind == "zero":
            tail = mix_f[int(round(t * sr)):]
            z = bool(tail.size and np.all(tail == 0.0))
            ok &= z
            print(f"  {t:>9.3f}{'—':>10}{'—':>10}  {'OK ' if z else '!! '} {label}"
                  f"（bit-exact 全零 {t:.3f}→{dur_exp:.3f}s）")
            continue
        if t >= dur_exp:
            continue
        if kind == "drop":
            pre = rms_db(mmono[int((t - 0.30 * scale) * sr):int((t + 0.005) * sr)])
            post = rms_db(mmono[int((t + 0.12 * scale) * sr):int((t + 0.40 * scale) * sr)])
            thr = 10.0 ** ((pre + post) / 40.0)
            w = np.hanning(int(0.01 * sr))
            w /= w.sum()
            ev = np.convolve(np.abs(mmono), w, mode="same")
            aa, bb = int(max(0.0, t - 0.05 * scale) * sr), int(min(dur_exp, t + 0.40 * scale) * sr)
            idx = np.nonzero(ev[aa:bb] < thr)[0]
            tm = (aa + int(idx[0])) / sr if idx.size else float("nan")
        elif t0 == 0.0:
            nz = np.nonzero(np.abs(mono[: sr // 2]) > 1e-7)[0]
            tm = int(nz[0]) / sr if nz.size else float("nan")
        else:
            tm, _rise = onset_time(mono, t, band)
            if tm is None:
                print(f"  {t:>9.3f}{'n/a':>10}{'n/a':>10}  !!   {label}")
                ok = False
                nbad += 1
                continue
        dev = (tm - t) * 1000.0
        good = abs(dev) < TOL_MS
        ok &= good
        nbad += 0 if good else 1
        worst = max(worst, abs(dev))
        print(f"  {t:>9.3f}{tm:>10.3f}{dev:>10.1f}  {'OK ' if good else '!! '} {label}")
    print(f"  hit 对齐：最大偏差 {worst:.1f} ms（阈值 {TOL_MS:.0f} ms），超限 {nbad} 项")

    # ---- 各 5s 窗 RMS 速览 ----
    print("  每 5s 窗 RMS（dBFS）：", end="")
    row = []
    for i in range(int(dur_exp // 5)):
        a, b = int(i * 5 * sr), int(min((i + 1) * 5, dur_exp) * sr)
        row.append(f"{i * 5}-{i * 5 + 5}s {rms_db(mono[a:b]):.1f}")
    print(" | ".join(row))
    print(f"  → {cut}s 版：{'全部通过' if ok else '存在未通过项'}")
    return ok


def main() -> None:
    ap = argparse.ArgumentParser(description="配乐校验")
    ap.add_argument("--cut", type=int, default=0, choices=(0, 60, 90), help="0=两版都查")
    a = ap.parse_args()
    cuts = [90, 60] if a.cut == 0 else [a.cut]
    res = [check_cut(c) for c in cuts]
    print("=" * 78)
    print("总结：", ", ".join(f"{c}s {'通过' if r else '未通过'}" for c, r in zip(cuts, res)))
    sys.exit(0 if all(res) else 1)


if __name__ == "__main__":
    main()
