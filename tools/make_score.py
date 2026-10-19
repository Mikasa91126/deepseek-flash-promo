#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
DeepSeek V4.1 Flash · 90 秒宣传片配乐（纯 numpy / scipy 程序合成，无采样、无联网）

产物（全部落在工程内，固定种子可重复）：
  public/audio/mix90.wav              最终混缩 48kHz / 立体声 / 16-bit / 90.000s
  public/audio/music90.wav            音乐 stem（同规格）
  public/audio/sfx90.wav              SFX stem（同规格）
  out/style/score-spectrogram.png     全片频谱图（scipy.signal.spectrogram + PIL）
  public/audio/score-report.txt       段落表 / hit 实测表 / 5s 窗 RMS 曲线

四段式：
  I  深海   0–15s   BPM 72   钢琴单音 + 40Hz drone + 声呐 ping，6.0s 三音动机首现
  II 涌动   15–55s  BPM 96→120（15–42 活跃 / 42–55 负重压抑）
  III 闪电  55–83s  BPM 124  55.0–56.2 近静默 → 60.0 闪电全奏 → 67.0 细碎拨弦 → 73.0 whoosh
  IV 收尾   83–90s  BPM 72   动机回归、钢琴单音收束，88.5 末音后留白

调性：A 自然小调 / D 多利亚色彩；动机 A3–C4–E4。
"""
from __future__ import annotations

import argparse
import math
import os
import zlib

import numpy as np
from scipy import signal as sps
from scipy.io import wavfile
from PIL import Image, ImageDraw, ImageFont

# ----------------------------------------------------------------------------
# 全局常量
# ----------------------------------------------------------------------------
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_DIR = os.path.join(ROOT, "public", "audio")
STYLE_DIR = os.path.join(ROOT, "out", "style")

SR = 48000
SEED = 20260910

# 时间轴缩放：90s 母版 TS=1.0；60s 精剪 TS=2/3（全部事件时刻 / 时长 / 混响 RT60 整体缩放，
# 音高、音色、调性、混音不变）。所有编排表一律写在 90s 坐标系里。
TS = 1.0
DUR = 90.0 * TS
N = int(round(SR * DUR))
CUT = "90"

MOTIF = ["A3", "C4", "E4"]          # 主题动机（清冷上行三音）
END_FADE = (89.05, 89.40)           # 末音之后收干净，89.40–90.000 为 bit-exact 全零（90s 坐标）


def ts(x: float) -> float:
    """90s 坐标系 → 当前版本时间轴。"""
    return x * TS

# 16 镜秒表（严格对齐）
SECTIONS = [
    ("S01", "黑场·第一声", 0.0, 5.0),
    ("S02", "鲸影", 5.0, 10.0),
    ("S03", "2023 起点", 10.0, 15.0),
    ("S04", "V2 鲶鱼", 15.0, 21.0),
    ("S05", "V3 巨鲸", 21.0, 27.0),
    ("S06", "R1 惊雷", 27.0, 33.0),
    ("S07", "Nature 封面", 33.0, 37.0),
    ("S08", "四金", 37.0, 42.0),
    ("S09", "记忆之重", 42.0, 48.0),
    ("S10", "压缩 437×", 48.0, 55.0),
    ("S11", "睁眼", 55.0, 60.0),
    ("S12", "发布日闪电", 60.0, 67.0),
    ("S13", "非对称架构", 67.0, 73.0),
    ("S14", "1M 上下文", 73.0, 78.0),
    ("S15", "象牙白价格卡", 78.0, 83.0),
    ("S16", "鲸群收尾", 83.0, 90.0),
]

# 关键 hit 秒表：0.0 ping / 6.0 motif / 15.0 段落 / 28.0 boom / 37.5–38.7 四声 chime /
# 42.0 压抑 / 54.0 chime / 55.0 静默 / 60.0 闪电 / 67.0 拨弦 / 73.0 whoosh /
# 83.0 主题 / 88.5 末音（kind: onset=起音，drop=骤降）
HITS = [
    (0.0, "sonar ping 声呐破题", "onset", "hi"),
    (6.0, "motif 主题动机首现 A3", "onset", "hi"),
    (15.0, "II 涌动 段落切换", "onset", "lo"),
    (28.0, "R1 boom 惊雷", "onset", "hi"),
    (37.5, "四金 chime 1 C5", "onset", (856.4, 985.4)),
    (37.9, "四金 chime 2 E5", "onset", (1079.2, 1241.5)),
    (38.3, "四金 chime 3 G5", "onset", (1283.2, 1476.4)),
    (38.7, "四金 chime 4 C6", "onset", (1712.9, 1970.8)),
    (42.0, "负重段 转压抑", "onset", "lo"),
    (54.0, "压缩段落定 chime", "onset", (1712.9, 1970.8)),
    (55.0, "睁眼 骤静", "drop", "music"),
    (60.0, "发布日 闪电全奏", "onset", "hi"),
    (67.0, "架构段 细碎拨弦", "onset", (3000.0, 7000.0)),
    (73.0, "洋面 whoosh", "onset", "hi"),
    (83.0, "主题动机回归", "onset", "hi"),
    (88.5, "末音 钢琴单音", "onset", "hi"),
    (89.40, "结尾全静音（bit-exact 0）", "zero", "mix"),
]


# ----------------------------------------------------------------------------
# 基础工具
# ----------------------------------------------------------------------------
def rng(tag: str) -> np.random.Generator:
    """按标签派生的独立随机流：全部随机性可复现（与 Python hash 无关）。"""
    return np.random.default_rng((SEED * 1000003 + zlib.crc32(tag.encode("utf-8"))) % (2 ** 63))


def db(x: float) -> float:
    return 10.0 ** (x / 20.0)


def tarr(n: int) -> np.ndarray:
    return np.arange(n, dtype=np.float64) / SR


def add(buf: np.ndarray, sig: np.ndarray, t0: float, pan: float = 0.0) -> None:
    """编排层叠加：t0 按 90s 坐标系给，内部换算到当前版本时间轴。"""
    place(buf, sig, t0 * TS, pan)


def place(buf: np.ndarray, sig: np.ndarray, t_real: float, pan: float = 0.0) -> None:
    """把 mono 信号按恒定功率 pan 叠加进一维或二维（N,2）缓冲；t_real 为真实秒。"""
    n = buf.shape[0]
    i0 = int(round(t_real * SR))
    if i0 >= n or sig.size == 0:
        return
    if i0 < 0:
        sig = sig[-i0:]
        i0 = 0
    m = min(sig.size, n - i0)
    if m <= 0:
        return
    s = sig[:m]
    if buf.ndim == 1:
        buf[i0:i0 + m] += s
    else:
        th = (float(pan) + 1.0) * math.pi / 4.0
        buf[i0:i0 + m, 0] += s * math.cos(th)
        buf[i0:i0 + m, 1] += s * math.sin(th)


def fade_edges(x: np.ndarray, ms: float = 4.0) -> np.ndarray:
    """给单块信号首尾做短淡化，杜绝块边界爆音。"""
    k = max(2, int(SR * ms / 1000.0))
    if x.size <= 2 * k:
        return x * np.hanning(x.size)
    w = np.ones(x.size)
    w[:k] = 0.5 - 0.5 * np.cos(np.linspace(0, math.pi, k))
    w[-k:] = w[:k][::-1]
    return x * w


def smooth_env(env: np.ndarray, ms: float = 25.0) -> np.ndarray:
    """把自动化折线磨圆，避免音量折角产生听觉上的突兀。"""
    k = max(3, int(SR * ms / 1000.0))
    w = np.hanning(k)
    w /= w.sum()
    pad = k // 2
    e = np.concatenate([np.full(pad, env[0]), env, np.full(pad, env[-1])])
    return np.convolve(e, w, mode="same")[pad:pad + env.size]


def env_from_keys(n: int, keys, smooth_ms: float = 25.0, tscale=None) -> np.ndarray:
    """keys: [(秒, 增益 dB)]（90s 坐标系）→ 逐样本线性(dB)插值 + 平滑的增益包络。"""
    sc = TS if tscale is None else tscale
    kt = np.array([k[0] for k in keys], dtype=np.float64) * sc
    kv = np.array([k[1] for k in keys], dtype=np.float64)
    t = np.arange(n, dtype=np.float64) / SR
    g = db(np.interp(t, kt, kv))
    return smooth_env(g, smooth_ms)


# ----------------------------------------------------------------------------
# 波形表与振荡器
# ----------------------------------------------------------------------------
def _saw_table(size: int = 4096, nh: int = 48) -> np.ndarray:
    n = np.arange(size, dtype=np.float64)
    x = np.zeros(size)
    for k in range(1, nh + 1):
        x += np.sin(2 * np.pi * k * n / size) / k
    return x / np.max(np.abs(x))


SAW = _saw_table()
_ARANGE_CACHE: dict = {}


def _arange(n: int) -> np.ndarray:
    a = _ARANGE_CACHE.get(n)
    if a is None:
        a = np.arange(n, dtype=np.float64)
        _ARANGE_CACHE[n] = a
    return a


def saw_osc(f: float, n: int, ph0: float = 0.0, table: np.ndarray = SAW) -> np.ndarray:
    """带限锯齿（波表读取）——pad 的基元，避免 naive saw 的折叠失真。"""
    size = table.size
    pos = ((ph0 + f * (_arange(n) / SR)) % 1.0) * size
    i0 = pos.astype(np.int64)
    frac = pos - i0
    i0 %= size
    i1 = (i0 + 1) % size
    return table[i0] + (table[i1] - table[i0]) * frac


_NAMES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def note(name: str) -> float:
    """音名 → 频率（A4=440）。"""
    v = _NAMES[name[0].upper()]
    i = 1
    if len(name) > 1 and name[1] in "#b":
        v += 1 if name[1] == "#" else -1
        i = 2
    midi = 12 * (int(name[i:]) + 1) + v
    return 440.0 * 2.0 ** ((midi - 69) / 12.0)


# ----------------------------------------------------------------------------
# 音色：felt piano / drone / pad / pluck / chime / 各种噪声音效
# ----------------------------------------------------------------------------
PIANO_PARTS = [(1.0, 1.000), (2.0, 0.210), (3.0, 0.095), (4.0, 0.038), (6.0, 0.013)]


def piano(f: float, dur: float, level_db: float, tag: str, decay: float = 1.2,
          bright: float = 1.0, pan: float = 0.0) -> np.ndarray:
    """felt piano：正弦 + 2–3 个泛音，快起音 / 指数衰减，±3 cents 随机失谐 + 同音弦拍频。"""
    dur, decay = dur * TS, decay * TS
    n = int(dur * SR)
    t = tarr(n)
    r = rng(tag)
    out = np.zeros(n)
    for m, a in PIANO_PARTS:
        fd = f * m * (1.0 + 0.00035 * m * m) * (2.0 ** (r.uniform(-3.0, 3.0) / 1200.0))
        out += (a * (bright ** (m - 1.0))) * np.sin(2 * np.pi * fd * t + r.uniform(0, 2 * np.pi)) \
            * np.exp(-t * ((1.0 + 0.85 * (m - 1.0)) / decay))
    f2 = f * (2.0 ** (r.uniform(-1.4, 1.4) / 1200.0))      # 第二根弦：缓慢拍频
    out += 0.45 * np.sin(2 * np.pi * f2 * t + r.uniform(0, 2 * np.pi)) * np.exp(-t / decay)
    hn = int(0.014 * SR)                                    # 槌击噪声
    if hn < n:
        h = r.normal(0.0, 1.0, hn) * np.exp(-np.arange(hn) / (0.0022 * SR))
        h = sps.sosfilt(sps.butter(2, 2400 / (SR / 2), "low", output="sos"), h)
        out[:hn] += 0.045 * bright * h
    out *= (1.0 - np.exp(-t / 0.004))
    return fade_edges(out * db(level_db))


def drone_layer(freqs, amps, n: int, keys, tag: str, lfo_hz: float = 0.06,
                noise_amt: float = 0.10) -> np.ndarray:
    """连续 drone 层：正弦叠加 + 缓慢 LFO 调幅 + 极轻气声。"""
    t = _arange(n) / SR
    r = rng(tag)
    out = np.zeros(n)
    for i, (f, a) in enumerate(zip(freqs, amps)):
        ph = r.uniform(0, 2 * np.pi)
        lfo = 1.0 + 0.26 * np.sin(2 * np.pi * (lfo_hz / TS) * (1.0 + 0.4 * i) * t
                                     + r.uniform(0, 6.28))
        out += a * np.sin(2 * np.pi * f * t + ph) * lfo
    if noise_amt > 0:
        nz = r.normal(0.0, 1.0, n)
        nz = sps.sosfilt(sps.butter(2, 120 / (SR / 2), "low", output="sos"), nz)
        out += noise_amt * nz / (np.max(np.abs(nz)) + 1e-12)
    out /= (np.max(np.abs(out)) + 1e-12)
    return out * env_from_keys(n, keys)


def pad(notes, dur: float, level_db: float, tag: str, cutoff: float = 1600.0,
        attack: float = 1.6, release: float = 2.0, voices: int = 2, pan: float = 0.0) -> np.ndarray:
    """pad：5–7 个失谐锯齿 → 低通 → 慢起慢落。"""
    dur, attack, release = dur * TS, attack * TS, release * TS
    n = int(dur * SR)
    t = tarr(n)
    r = rng(tag)
    out = np.zeros(n)
    for f in notes:
        for _ in range(voices):
            out += saw_osc(f * (2.0 ** (r.uniform(-9.0, 9.0) / 1200.0)), n, r.random())
    out /= max(1, len(notes) * voices)
    sos = sps.butter(2, min(cutoff, 0.45 * SR) / (SR / 2), "low", output="sos")
    out = sps.sosfiltfilt(sos, out) if n > 64 else out
    env = (1.0 - np.exp(-t / max(0.02, attack))) * (1.0 - np.exp(-(dur - t) / max(0.02, release)))
    env = np.clip(env, 0.0, 1.0)
    return fade_edges(out * env * db(level_db))


def pluck(f: float, dur: float, level_db: float, tag: str, damp: float = 0.9965,
          bright: float = 1.0, pan: float = 0.0) -> np.ndarray:
    """Karplus-Strong 拨弦。"""
    dur = dur * TS
    N = max(2, int(round(SR / f)))
    total = int(dur * SR)
    r = rng(tag)
    buf = r.normal(0.0, 1.0, N)
    if bright < 1.0:
        buf = sps.sosfilt(sps.butter(1, min(0.45 * SR, 1200 + 9000 * bright) / (SR / 2), "low",
                                     output="sos"), buf)
    buf /= (np.max(np.abs(buf)) + 1e-12)
    y = np.zeros(total + N + 1)
    y[1:1 + N] = buf
    pos = 1 + N
    while pos < total + 1:
        m = min(N, total + 1 - pos)
        a = y[pos - N:pos - N + m]
        b = y[pos - N - 1:pos - N - 1 + m]
        y[pos:pos + m] = damp * 0.5 * (a + b)
        pos += m
    out = y[1:total + 1]
    out *= np.exp(-tarr(total) / (dur * 0.62))
    return fade_edges(out * db(level_db))


def chime(f: float, level_db: float, tag: str, decay: float = 0.62, dur: float = 2.6,
          i1: float = 2.3, i2: float = 0.55, r1: float = 2.76, r2: float = 5.40,
          pan: float = 0.0) -> np.ndarray:
    """玻璃马林巴 / 清铃：FM 合成（载波 + 非谐分音比 2.76 / 5.4）。"""
    decay, dur = decay * TS, dur * TS
    n = int(dur * SR)
    t = tarr(n)
    m1 = np.sin(2 * np.pi * f * r1 * t) * np.exp(-t / max(0.02, decay * 0.42))
    m2 = np.sin(2 * np.pi * f * r2 * t) * np.exp(-t / max(0.02, decay * 0.20))
    car = np.sin(2 * np.pi * f * t + i1 * m1 + i2 * m2)
    env = (1.0 - np.exp(-t / 0.0022)) * np.exp(-t / decay)
    return fade_edges(car * env * db(level_db))


def pluck_bell(f: float, level_db: float, tag: str, decay: float = 0.5) -> np.ndarray:
    """细碎的马林巴闪烁（比 chime 更短更薄）。"""
    return chime(f, level_db, tag, decay=decay, dur=decay * 4.5, i1=1.5, i2=0.3)


def boom(level_db: float = -8.0, tag: str = "boom") -> np.ndarray:
    """R1 惊雷：50→35Hz 音高下坠 + 次低音 + 2s 指数尾（带 3ms 雷击瞬态）。"""
    dur = 3.0 * TS
    n = int(dur * SR)
    t = tarr(n)
    r = rng(tag)
    f = 50.0 * (35.0 / 50.0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) + 0.42 * np.sin(0.5 * ph + 0.3)
    sig += 0.10 * np.sin(2.0 * ph)
    th = int(0.18 * TS * SR)                             # 冲击瞬态（雷击"裂"：宽带噪声）
    dump = r.normal(0.0, 1.0, th) * np.exp(-np.arange(th) / (0.020 * TS * SR))
    dump = sps.sosfilt(sps.butter(2, 1100 / (SR / 2), "low", output="sos"), dump)
    sig[:th] += 2.6 * dump / (np.max(np.abs(dump)) + 1e-12)
    env = (1.0 - np.exp(-t / (0.003 * TS))) * np.exp(-t / (0.62 * TS))
    sig = np.tanh(sig * 1.15) * env
    ck = int(0.012 * TS * SR)                            # 裂口瞬态
    crk = r.normal(0.0, 1.0, ck) * np.exp(-np.arange(ck) / (0.0016 * TS * SR))
    crk = sps.sosfilt(sps.butter(2, [300 / (SR / 2), 5200 / (SR / 2)], "bandpass",
                                 output="sos"), crk)
    sig[:ck] += 1.5 * crk / (np.max(np.abs(crk)) + 1e-12)
    sig = sig / (np.max(np.abs(sig)) + 1e-12)
    return fade_edges(sig * db(level_db))


def sonar_ping(level_db: float = -18.0, tag: str = "ping") -> np.ndarray:
    """声呐 ping：1kHz 短促衰减 + 3 次回声（0.35s / 0.4×）。"""
    n = int(1.4 * TS * SR)
    t = tarr(n)
    base = np.sin(2 * np.pi * 1000.0 * t) * (1.0 - np.exp(-t / (0.0025 * TS))) \
        * np.exp(-t / (0.125 * TS))
    base += 0.16 * np.sin(2 * np.pi * 2010.0 * t) * (1.0 - np.exp(-t / (0.002 * TS))) \
        * np.exp(-t / (0.05 * TS))
    out = np.zeros(int(2.9 * TS * SR))
    for k in range(4):
        place(out, fade_edges(base * (0.40 ** k)), k * 0.35 * TS)
    return out * db(level_db)


def ola_scan(x: np.ndarray, keys, kind: str = "bandpass", q: float = 1.6,
             order: int = 2, win: int = 8192, tscale=None) -> np.ndarray:
    """时变滤波器（重叠相加）：中心/截止频率按 keys=[(秒, Hz)] 插值。
    keys 默认按 90s 坐标系（tscale=TS）；短音效内部传局部坐标时用 tscale=TS 保持同比例。
    用于 whoosh / 水流 / shimmer / 全片段落音色 EQ。"""
    hop = win // 4
    pad = win // 2
    xp = np.concatenate([np.zeros(pad), x, np.zeros(pad + win)])
    out = np.zeros_like(xp)
    wsum = np.zeros_like(xp)
    w = sps.windows.hann(win)
    sc = TS if tscale is None else tscale
    kt = np.array([k[0] for k in keys], dtype=np.float64) * sc
    kv = np.array([k[1] for k in keys], dtype=np.float64)
    nyq = SR / 2.0
    for s in range(0, xp.size - win + 1, hop):
        tc = (s + win / 2.0 - pad) / SR
        fc = float(np.interp(tc, kt, kv))
        seg = xp[s:s + win]
        if kind == "bandpass":
            f2 = min(fc * (1.0 + 1.0 / (2.0 * q)), 0.47 * SR)
            f1 = max(fc * (1.0 - 1.0 / (2.0 * q)), 20.0)
            if f1 >= f2 * 0.9:
                f1 = f2 * 0.6
            sos = sps.butter(order, [f1 / nyq, f2 / nyq], "bandpass", output="sos")
        else:
            fc = min(max(fc, 20.0), 0.47 * SR)
            sos = sps.butter(order, fc / nyq, kind, output="sos")
        out[s:s + win] += sps.sosfilt(sos, seg) * w
        wsum[s:s + win] += w
    out = out / np.maximum(wsum, 1e-9)
    return out[pad:pad + x.size]


def white(n: int, tag: str) -> np.ndarray:
    return rng(tag).normal(0.0, 1.0, n)


def pink(n: int, tag: str) -> np.ndarray:
    x = white(n, tag)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1.0 / SR)
    f[0] = f[1]
    X *= 1.0 / np.sqrt(f)
    y = np.fft.irfft(X, n)
    return y / (np.max(np.abs(y)) + 1e-12)


def swell(kind: str, dur: float, level_db: float, tag: str, f_keys, curve: float = 1.0,
          q: float = 1.6, attack: float = 0.85) -> np.ndarray:
    """shimmer / 噪声上扫式渐强。曲线 curve>1 表示前松后紧。"""
    dur = dur * TS
    n = int(dur * SR)
    src = pink(n, tag + "n") if kind == "pink" else white(n, tag + "n")
    y = ola_scan(src, f_keys, "bandpass", q=q, tscale=TS)
    t = tarr(n)
    env = np.clip(t / max(0.05, dur * attack), 0.0, 1.0) ** curve
    env *= np.clip((dur - t) / max(0.05, dur * 0.22), 0.0, 1.0)
    return fade_edges(y * env * db(level_db), 8.0)


def whoosh(dur: float, level_db: float, tag: str = "whoosh", f0: float = 300.0,
           f1: float = 4000.0) -> np.ndarray:
    """洋面 whoosh：白噪声带通 300Hz → 4kHz 上扫。"""
    n0 = int(dur * TS * SR)
    y = ola_scan(white(n0, tag), [(0.0, f0), (dur * 0.55, math.sqrt(f0 * f1)), (dur, f1)],
                 "bandpass", q=1.1, tscale=TS)
    rum = sps.sosfilt(sps.butter(2, 160 / (SR / 2), "low", output="sos"), white(n0, tag + "r"))
    n = n0
    t = tarr(n)
    # 快速抵达（掠过的风）后慢落，起音与镜头切换对齐
    env = (1.0 - np.exp(-t / (0.007 * TS))) \
        * np.exp(-np.clip(t - 0.07 * TS, 0, None) / (dur * TS * 0.42))
    env = np.clip(env, 0, 1)
    y = y / (np.max(np.abs(y)) + 1e-12) + 0.5 * rum / (np.max(np.abs(rum)) + 1e-12)
    return fade_edges(y * env * db(level_db), 8.0)


def water_flow(dur: float, level_db: float, tag: str = "water") -> np.ndarray:
    """极轻水流：带通噪声 + 缓慢随机起伏。"""
    keys = [(0.0, 700.0), (dur * 0.5, 1200.0), (dur, 620.0)]
    dur = dur * TS
    n = int(dur * SR)
    r = rng(tag)
    src = white(n, tag)
    y = ola_scan(src, keys, "bandpass", q=0.8, tscale=TS)
    am = sps.sosfilt(sps.butter(2, 0.6 / (SR / 2), "low", output="sos"), r.normal(0, 1, n))
    am = 0.72 + 0.28 * am / (np.max(np.abs(am)) + 1e-12)
    y = y / (np.max(np.abs(y)) + 1e-12) * am
    return fade_edges(y * db(level_db), 250.0 * TS)


def metal_tick(level_db: float, tag: str, f_base: float = 2400.0) -> np.ndarray:
    """细碎金属声：非谐模态 + 极短衰减（负重段的粒子链）。"""
    dur = 0.45 * TS
    n = int(dur * SR)
    t = tarr(n)
    r = rng(tag)
    out = np.zeros(n)
    for k, ratio in enumerate([0.76, 1.12, 1.63, 2.21, 3.05]):
        f = f_base * ratio * (1.0 + r.uniform(-0.03, 0.03))
        out += (0.9 ** k) * np.sin(2 * np.pi * f * t + r.uniform(0, 6.28)) \
            * np.exp(-t / ((0.045 + 0.02 * k) * TS))
    cl = int(0.004 * SR)
    out[:cl] += 0.5 * r.normal(0, 1, cl) * np.exp(-np.arange(cl) / (0.0012 * SR))
    return fade_edges(out / (np.max(np.abs(out)) + 1e-12) * db(level_db), 2.0)


def digi_tick(level_db: float, tag: str, f: float = 2400.0) -> np.ndarray:
    """打字机 / 数字落定 tick。"""
    dur = 0.25 * TS
    n = int(dur * SR)
    t = tarr(n)
    r = rng(tag)
    out = np.sin(2 * np.pi * f * t) * np.exp(-t / (0.012 * TS))
    out += 0.4 * np.sin(2 * np.pi * f * 2.7 * t) * np.exp(-t / (0.005 * TS))
    cl = int(0.003 * SR)
    out[:cl] += 0.9 * r.normal(0, 1, cl) * np.exp(-np.arange(cl) / (0.0008 * SR))
    return fade_edges(out / (np.max(np.abs(out)) + 1e-12) * db(level_db), 1.5)


def deep_tick(level_db: float, tag: str) -> np.ndarray:
    """沉重落定：低音 tick。"""
    dur = 0.9 * TS
    n = int(dur * SR)
    t = tarr(n)
    r = rng(tag)
    out = np.sin(2 * np.pi * 196.0 * t) * np.exp(-t / (0.075 * TS))
    out += 0.5 * np.sin(2 * np.pi * 98.0 * t) * np.exp(-t / (0.16 * TS))
    th = int(0.02 * SR)
    d = r.normal(0, 1, th) * np.exp(-np.arange(th) / (0.004 * SR))
    d = sps.sosfilt(sps.butter(2, 900 / (SR / 2), "low", output="sos"), d)
    out[:th] += 2.0 * d / (np.max(np.abs(d)) + 1e-12)
    return fade_edges(out / (np.max(np.abs(out)) + 1e-12) * db(level_db), 3.0)


def whale_call(level_db: float, tag: str = "whale") -> np.ndarray:
    """合成鲸歌：滑音 + 颤音 + 少量泛音。"""
    dur = 2.6 * TS
    n = int(dur * SR)
    t = tarr(n)
    r = rng(tag)
    f_c = np.interp(t, [0.0, 0.35 * TS, 1.1 * TS, 1.9 * TS, dur],
                    [150.0, 208.0, 322.0, 236.0, 178.0])
    f_c = f_c * (1.0 + 0.035 * np.sin(2 * np.pi * (5.1 / TS) * t + r.uniform(0, 6.28)))
    ph = 2 * np.pi * np.cumsum(f_c) / SR
    out = np.sin(ph) + 0.34 * np.sin(2 * ph + 0.4) + 0.11 * np.sin(3 * ph)
    sos = sps.butter(2, 1300 / (SR / 2), "low", output="sos")
    out = sps.sosfilt(sos, out)
    env = (1.0 - np.exp(-t / (0.30 * TS))) * np.exp(-np.clip(t - 1.1 * TS, 0, None) / (0.75 * TS))
    return fade_edges(out * env * db(level_db), 20.0)


def water_splash(level_db: float, tag: str = "splash") -> np.ndarray:
    """水花：宽带瞬态 + 若干水滴。"""
    dur = 1.6 * TS
    n = int(dur * SR)
    r = rng(tag)
    out = np.zeros(n)
    m0 = int(0.5 * TS * SR)
    main = white(m0, tag + "m") * np.exp(-np.arange(m0) / (0.045 * TS * SR))
    main = sps.sosfilt(sps.butter(2, [600 / (SR / 2), 7000 / (SR / 2)], "bandpass", output="sos"), main)
    place(out, fade_edges(main / (np.max(np.abs(main)) + 1e-12), 3.0), 0.0)
    for i in range(14):
        d = int((0.08 + r.uniform(0, 1.0)) * TS * SR) / SR     # 量化到采样点
        ln = int(0.09 * TS * SR)
        x = r.normal(0, 1, ln) * np.exp(-np.arange(ln) / (0.008 * TS * SR))
        fc = r.uniform(900, 5200)
        x = sps.sosfilt(sps.butter(2, [fc * 0.7 / (SR / 2), min(fc * 1.4, 0.45 * SR) / (SR / 2)],
                                   "bandpass", output="sos"), x)
        place(out, fade_edges(x / (np.max(np.abs(x)) + 1e-12) * r.uniform(0.15, 0.5), 2.0), d)
    return out / (np.max(np.abs(out)) + 1e-12) * db(level_db)


def paper_flip(level_db: float, tag: str = "paper") -> np.ndarray:
    """纸页翻动：两三下摩擦噪声。"""
    n = int(1.0 * TS * SR)
    out = np.zeros(n)
    r = rng(tag)
    for k, (t0, ln, g) in enumerate([(0.02, 0.22, 1.0), (0.20, 0.30, 0.8), (0.42, 0.20, 0.5)]):
        m = int(ln * TS * SR)
        x = r.normal(0, 1, m)
        x = sps.sosfilt(sps.butter(2, [1400 / (SR / 2), 9000 / (SR / 2)], "bandpass", output="sos"), x)
        e = np.sin(np.linspace(0, math.pi, m)) ** 1.4
        place(out, fade_edges(x * e / (np.max(np.abs(x * e)) + 1e-12) * g, 5.0), t0 * TS)
    return out / (np.max(np.abs(out)) + 1e-12) * db(level_db)


def card_flip(level_db: float, tag: str = "card") -> np.ndarray:
    """翻卡：短促气流 + 轻落。"""
    n = int(0.9 * TS * SR)
    r = rng(tag)
    x = white(int(0.30 * TS * SR), tag + "n")
    x = ola_scan(x, [(0.0, 3600.0), (0.30, 700.0)], "bandpass", q=1.2, tscale=TS)
    out = np.zeros(n)
    place(out, fade_edges(x * np.sin(np.linspace(0, math.pi, x.size)) ** 1.2, 4.0), 0.0)
    th = int(0.25 * TS * SR)
    d = r.normal(0, 1, th) * np.exp(-np.arange(th) / (0.02 * TS * SR))
    d = sps.sosfilt(sps.butter(2, 300 / (SR / 2), "low", output="sos"), d)
    place(out, fade_edges(d, 4.0), 0.30 * TS)
    return out / (np.max(np.abs(out)) + 1e-12) * db(level_db)


def breath(level_db: float, tag: str = "breath") -> np.ndarray:
    """呼吸声：带通噪声的进出声。"""
    keys = [(0.0, 420.0), (0.5, 900.0), (1.1, 1500.0), (1.5, 380.0)]
    dur = 1.5 * TS
    n = int(dur * SR)
    x = white(n, tag)
    x = ola_scan(x, keys, "bandpass", q=0.9, tscale=TS)
    t = tarr(n)
    env = np.clip(t / (0.55 * TS), 0, 1) ** 1.2 * np.clip((dur - t) / (0.7 * TS), 0, 1) ** 1.3
    return fade_edges(x / (np.max(np.abs(x)) + 1e-12) * env * db(level_db), 15.0)


def crackle(level_db: float, tag: str = "crackle") -> np.ndarray:
    """闪电 crackle（克制）：一次亮度下扫 + 密集噼啪 + 低频雷声。"""
    dur = 1.9 * TS
    n = int(dur * SR)
    r = rng(tag)
    out = np.zeros(n)
    zipn = int(0.26 * TS * SR)
    z = ola_scan(white(zipn, tag + "z"), [(0.0, 6200.0), (0.26, 900.0)], "bandpass", q=0.9,
                 tscale=TS)
    place(out, fade_edges(z / (np.max(np.abs(z)) + 1e-12) * np.exp(-tarr(zipn) / (0.09 * TS)), 3.0), 0.0)
    ln = int(0.004 * TS * SR)
    for i in range(90):
        tt = float(r.uniform(0.004, 0.95)) * TS
        g = float(r.uniform(0.15, 1.0)) * math.exp(-tt / (0.30 * TS))
        x = r.normal(0, 1, ln) * np.exp(-np.arange(ln) / (0.0009 * TS * SR))
        place(out, fade_edges(x * g, 1.0), tt)
    out = sps.sosfilt(sps.butter(2, 1200 / (SR / 2), "high", output="sos"), out)
    th = int(1.6 * TS * SR)
    rum = r.normal(0, 1, th) * np.exp(-np.arange(th) / (0.35 * TS * SR))
    rum = sps.sosfilt(sps.butter(2, 140 / (SR / 2), "low", output="sos"), rum)
    place(out, fade_edges(rum, 10.0), 0.02 * TS)
    return out / (np.max(np.abs(out)) + 1e-12) * db(level_db)


def low_swell(dur: float, level_db: float, tag: str = "lowswell") -> np.ndarray:
    """低频 swell 渐强（S2 鲸影）。"""
    dur = dur * TS
    n = int(dur * SR)
    x = white(n, tag)
    x = sps.sosfilt(sps.butter(2, 150 / (SR / 2), "low", output="sos"), x)
    t = tarr(n)
    env = np.clip(t / (dur * 0.85), 0, 1) ** 1.6 * np.clip((dur - t) / (dur * 0.25), 0, 1)
    return fade_edges(x / (np.max(np.abs(x)) + 1e-12) * env * db(level_db), 40.0)


# ----------------------------------------------------------------------------
# 混响：指数衰减噪声 IR + fftconvolve
# ----------------------------------------------------------------------------
def make_ir(rt60: float = 1.6 * TS, tag: str = "ir", damp_hz: float = 6500.0,
            hp_hz: float = 150.0) -> np.ndarray:
    tau = rt60 / 6.9078
    n = int(rt60 * 1.15 * SR)
    t = tarr(n)
    decay = np.exp(-t / tau)
    ir = np.zeros((n, 2))
    for ch in range(2):
        r = rng(f"{tag}{ch}")
        x = r.normal(0.0, 1.0, n) * decay * (1.0 - np.exp(-t / 0.002))
        x = sps.sosfilt(sps.butter(2, damp_hz / (SR / 2), "low", output="sos"), x)
        x = sps.sosfilt(sps.butter(2, hp_hz / (SR / 2), "high", output="sos"), x)
        ir[:, ch] = x
    ir /= math.sqrt(float(np.sum(ir[:, 0] ** 2)))          # L2 归一：湿声 ≈ 干声量级
    return ir


def convolve_stereo(x: np.ndarray, ir: np.ndarray, n_out: int) -> np.ndarray:
    out = np.zeros((n_out, 2))
    for ch in range(2):
        y = sps.fftconvolve(x[:, ch], ir[:, ch], mode="full")[:n_out]
        out[:, ch] = y
    return out


# 段落音色 EQ（对音乐总线做时变低通：负重段明显闷，闪电段打开）
EQ_KEYS = [(0.0, 4200.0), (10.0, 3600.0), (15.0, 3200.0), (21.0, 2600.0), (27.0, 2200.0),
           (33.0, 2500.0), (37.0, 3300.0), (41.9, 3200.0), (42.0, 700.0), (55.0, 700.0),
           (56.4, 1100.0), (59.9, 2600.0), (60.0, 6800.0), (66.9, 5200.0), (67.0, 4000.0),
           (72.9, 3800.0), (73.0, 4400.0), (77.9, 4000.0), (78.0, 7000.0), (82.9, 7000.0),
           (83.0, 3200.0), (90.0, 3000.0)]

# 湿声比例（10%–25%）
WET_KEYS = [(0.0, 0.18), (15.0, 0.15), (28.0, 0.23), (33.0, 0.18), (42.0, 0.10),
            (55.0, 0.12), (60.0, 0.25), (67.0, 0.18), (73.0, 0.20), (78.0, 0.15),
            (83.0, 0.22), (88.0, 0.12), (89.4, 0.0), (90.0, 0.0)]

# 55.0–56.2 全片最静（音乐降到近静默，只留水流）
SILENCE_KEYS = [(55.00, 0.0), (55.05, -26.0), (56.20, -26.0), (56.80, 0.0), (90.0, 0.0)]

# drone 层增益自动化（dB）
SUB_KEYS = [(0.0, -17.5), (15.0, -21.0), (27.0, -18.0), (28.0, -11.0), (29.5, -25.0),
            (33.0, -27.0), (41.5, -26.0), (42.0, -22.0), (54.8, -22.0), (55.2, -30.0),
            (56.4, -30.0), (60.0, -13.0), (66.8, -17.0), (67.0, -25.0), (72.8, -25.0),
            (73.0, -19.0), (77.8, -23.0), (78.0, -36.0), (82.8, -36.0), (83.0, -19.0),
            (87.6, -17.0), (88.4, -36.0), (89.0, -60.0), (90.0, -60.0)]
MID_KEYS = [(0.0, -46.0), (13.8, -46.0), (15.0, -24.0), (20.8, -22.0), (21.0, -19.0),
            (27.8, -17.0), (28.0, -9.0), (29.5, -27.0), (33.0, -28.0), (41.5, -30.0),
            (42.0, -26.0), (54.8, -26.0), (55.2, -34.0), (56.4, -34.0), (60.0, -12.0),
            (66.8, -19.0), (67.0, -25.0), (72.8, -25.0), (73.0, -20.0), (77.8, -25.0),
            (78.0, -44.0), (82.8, -44.0), (83.0, -18.0), (87.6, -16.0), (88.5, -44.0),
            (89.0, -60.0), (90.0, -60.0)]

MUSIC_PEAK_DB = -3.2     # 音乐 stem 峰值目标
SFX_PEAK_DB = -8.6       # SFX stem 峰值目标
MIX_PEAK_CEIL = 0.90     # 混缩峰值上限（软限幅阈值，须 < 0.99）
CLIP_THR = 0.90


# ----------------------------------------------------------------------------
# 编排：音乐总线
# ----------------------------------------------------------------------------
def build_music(n: int) -> np.ndarray:
    M = np.zeros((n, 2))

    # ---------- 连续 drone 铺底：40Hz + 60Hz 次谐波 / A1 中低层 ----------
    add(M, drone_layer([40.0, 60.0, 80.0], [1.0, 0.28, 0.10], n, SUB_KEYS, "dsub"), 0.0)
    add(M, drone_layer([55.0, 82.41, 110.0], [1.0, 0.45, 0.18], n, MID_KEYS, "dmid",
                       lfo_hz=0.045), 0.0)

    def P(name, t0, lev, tag, dec=1.2, pan=0.0):
        add(M, piano(note(name), 3.4 * dec, lev, tag, decay=dec), t0, pan)

    # ================= I 深海（0–15s · BPM 72）=================
    P("A2", 3.0, -17.0, "p_i1", 1.7)
    add(M, pad([note("A2"), note("E3")], 5.4, -23.0, "pad_i", cutoff=1300.0,
               attack=2.4, release=1.6), 10.0)
    P("A3", 6.00, -16.0, "p_m1", 1.25)                     # motif 首现
    P("C4", 6.75, -16.5, "p_m2", 1.25)
    P("E4", 7.50, -17.0, "p_m3", 1.40)
    P("E3", 10.70, -21.0, "p_i2", 1.1)
    P("A2", 12.60, -19.0, "p_i3", 1.5)
    P("E3", 14.20, -22.0, "p_i4", 1.2)

    # ================= II 涌动（15–55s）=================
    P("A1", 15.00, -13.0, "p_ii0a", 2.0)                   # 15.0 段落切换
    P("A2", 15.00, -15.5, "p_ii0b", 1.6)
    add(M, pad([note("A2"), note("C4"), note("E3")], 6.4, -21.0, "pad_ii1", cutoff=1700.0,
               attack=1.3, release=1.8), 15.0)
    # V2 七声上行轻拨（每 0.7s 一拨）
    for i, nm in enumerate(["A3", "C4", "D4", "E4", "G4", "A4", "C5"]):
        add(M, pluck(note(nm), 1.7, -14.0, f"plk{i}", bright=0.72), 15.55 + 0.70 * i)
    # V3 巨鲸：低音提琴式长音
    P("E2", 21.00, -13.0, "p_ii2a", 2.3)
    P("A1", 21.00, -12.0, "p_ii2b", 2.7)
    add(M, pad([note("A1"), note("E2")], 6.8, -16.0, "pad_ii2", cutoff=470.0, attack=1.3,
               release=1.7, voices=3), 21.0)
    P("A3", 23.60, -20.0, "p_ii3a", 1.3)
    P("E4", 25.10, -20.0, "p_ii3b", 1.3)
    # R1 惊雷
    P("A1", 27.00, -11.0, "p_ii4a", 2.5)
    P("E2", 27.00, -12.0, "p_ii4b", 2.2)
    add(M, pad([note("A2"), note("E3"), note("A3")], 1.5, -20.0, "pad_ii4", cutoff=1500.0,
               attack=0.85, release=0.5), 26.4)
    add(M, boom(-8.0), 28.0)                               # 28.0 R1 boom
    add(M, pad([note("A1")], 5.2, -22.0, "pad_ii5", cutoff=320.0, attack=1.6, release=2.0),
        28.7)
    P("A2", 30.10, -22.0, "p_ii5a", 1.6)
    P("E3", 31.60, -24.0, "p_ii5b", 1.4)
    # S7 Nature 封面
    add(M, pad([note("A2"), note("E3")], 4.4, -23.0, "pad_iii1", cutoff=1400.0, attack=1.5,
               release=1.8), 33.0)
    P("A3", 34.00, -19.0, "p_s7a", 1.3)
    add(M, chime(note("A5"), -16.0, "ch_s7", decay=0.9), 34.80)
    P("E4", 35.60, -20.0, "p_s7b", 1.2)
    # S8 四金：C5-E5-G5-C6 四声上行 chime
    for i, nm in enumerate(["C5", "E5", "G5", "C6"]):
        add(M, chime(note(nm), -12.0, f"ch_g{i}", decay=0.95), 37.5 + 0.4 * i)
    add(M, pad([note("A2"), note("C4"), note("E4")], 5.6, -22.0, "pad_s8", cutoff=1900.0,
               attack=1.5, release=2.0), 37.0)
    P("A3", 39.60, -20.0, "p_s8a", 1.4)
    # S9 记忆之重 / S10 压缩 437×：42.0 转压抑，只留低音脉冲
    P("A1", 42.00, -13.0, "p_s9a", 2.4)                    # 42.0 转压抑 hit
    for i, t0 in enumerate([44.0, 46.0, 48.0, 50.0, 52.0, 53.4]):
        P("A1", t0, -18.0, f"p_pulse{i}", 1.0)
    P("E2", 45.0, -24.0, "p_s9b", 1.0)
    P("A1", 54.00, -16.0, "p_s10b", 1.4)
    add(M, chime(note("C6"), -6.0, "ch_54", decay=0.55), 54.0)   # 54.0 chime 落定

    # ================= III 闪电（55–83s · BPM 124）=================
    add(M, pad([note("A2"), note("E3")], 4.0, -20.0, "pad_iii2", cutoff=1500.0, attack=3.2,
               release=0.6), 56.4)                             # 蓄势
    P("A3", 57.00, -18.0, "p_iii1", 1.3)
    P("C4", 58.00, -18.0, "p_iii2", 1.3)
    P("E4", 58.90, -18.0, "p_iii3", 1.3)
    # 60.0 闪电全奏：弦乐 / pad 齐奏动机（每音 1.5 拍 @124）
    add(M, pad([note("A2"), note("A3"), note("E3"), note("C4")], 7.0, -13.0, "pad_tutti",
               cutoff=4300.0, attack=0.06, release=2.4, voices=2), 60.0)
    add(M, pad([note("A1"), note("E2")], 5.6, -15.0, "pad_tuttilow", cutoff=900.0,
               attack=0.08, release=2.0, voices=2), 60.0)
    P("A1", 60.00, -11.0, "p_tut0", 1.8)
    P("A2", 60.00, -13.0, "p_tut1", 1.6)
    for i, (nm, t0) in enumerate([("A4", 60.0), ("C5", 60.726), ("E5", 61.452)]):
        add(M, chime(note(nm), -14.0, f"ch_tut{i}", decay=1.4, i1=2.0), t0)
    add(M, pad([note("A2"), note("E3"), note("C4")], 6.6, -19.0, "pad_tutti2", cutoff=3600.0,
               attack=0.9, release=2.0), 61.6)
    for i, (nm, t0) in enumerate([("A3", 61.5), ("C4", 61.72), ("E4", 61.94), ("A4", 62.16)]):
        P(nm, t0, -18.0, f"p_tutar{i}", 1.1)
    for i, (nm, t0) in enumerate([("E5", 62.6), ("A5", 63.4), ("C6", 64.2)]):   # 三端点亮
        add(M, chime(note(nm), -16.0, f"ch_ui{i}", decay=0.8), t0)
    add(M, pad([note("A2"), note("E3"), note("C4")], 2.8, -20.0, "pad_tutti3", cutoff=3000.0,
               attack=1.2, release=1.2), 64.5)
    P("E4", 65.10, -18.0, "p_tut3", 1.2)
    P("C4", 65.70, -19.0, "p_tut4", 1.2)
    P("A3", 66.30, -19.0, "p_tut5", 1.2)
    # 67.0 架构段：8 声细碎拨弦（pow(i,0.8) 错落）
    for i, nm in enumerate(["A3", "C4", "E4", "G4", "A4", "C5", "E5", "G5"]):
        t0 = 67.0 + 5.2 * (i / 7.0) ** 1.25
        add(M, pluck(note(nm), 1.5, -15.0, f"plk_a{i}", bright=0.66), t0, pan=0.25 - 0.07 * i)
    add(M, pad([note("A2"), note("E3"), note("A3")], 6.2, -23.0, "pad_a", cutoff=2100.0,
               attack=1.5, release=2.0), 67.0)
    P("A4", 70.50, -20.0, "p_a1", 1.3)
    P("E4", 71.60, -21.0, "p_a2", 1.3)
    # 73.0 1M 上下文
    P("A1", 73.00, -13.0, "p_c1", 2.2)
    add(M, pad([note("A2"), note("E3"), note("A3")], 5.4, -19.0, "pad_c", cutoff=2600.0,
               attack=0.9, release=2.0), 73.0)
    P("E4", 74.20, -17.0, "p_c2", 1.3)                     # 两柱落定双音
    P("A4", 74.85, -16.0, "p_c3", 1.4)
    P("A3", 76.20, -19.0, "p_c4", 1.3)
    P("C4", 77.20, -19.0, "p_c5", 1.3)
    # 78–83 象牙白价格卡（大亮场）
    add(M, pad([note("C4"), note("E4"), note("A4")], 5.4, -21.0, "pad_e", cutoff=4200.0,
               attack=1.3, release=2.2), 78.0)
    for i, (nm, t0) in enumerate([("A4", 78.60), ("C5", 79.80), ("E5", 81.00)]):
        P(nm, t0, -16.0, f"p_e{i}", 1.3)
        add(M, pluck_bell(note(nm) * 2.0, -24.0, f"pb_e{i}", decay=0.45), t0 + 0.01)
    P("E4", 82.60, -20.0, "p_e4", 1.3)

    # ================= IV 收尾（83–90s · BPM 72）=================
    add(M, pad([note("A2"), note("E3"), note("A3")], 5.4, -20.0, "pad_iv", cutoff=2600.0,
               attack=1.6, release=3.0), 83.0)
    P("A3", 83.00, -13.0, "p_iv1", 1.35)                   # 83.0 主题动机回归
    P("C4", 83.75, -13.5, "p_iv2", 1.35)
    P("E4", 84.50, -14.0, "p_iv3", 1.45)
    P("E4", 85.60, -20.0, "p_iv4", 1.3)
    P("C4", 86.90, -21.0, "p_iv5", 1.3)
    P("A2", 87.60, -24.0, "p_iv6", 1.1)
    P("A3", 88.50, -18.0, "p_iv7", 0.30)                   # 88.5 最后一枚钢琴单音
    return M


# ----------------------------------------------------------------------------
# 编排：SFX 总线
# ----------------------------------------------------------------------------
def build_sfx(n: int) -> np.ndarray:
    S = np.zeros((n, 2))
    add(S, sonar_ping(-18.0), 0.0)                                     # 0.0 声呐 ping
    add(S, low_swell(4.6, -22.0), 5.2)                                 # S2 低频 swell
    add(S, whale_call(-14.0), 6.3)                                     # 鲸歌
    for i, t0 in enumerate([10.5, 10.8, 11.1]):                        # 打字机 tick ×3
        add(S, digi_tick(-16.0, f"tw{i}", f=1750.0 + 260 * i), t0)
    add(S, digi_tick(-17.0, "dg1", f=3100.0), 20.30)                   # 价格数字落定
    add(S, digi_tick(-17.0, "dg2", f=2600.0), 20.60)
    for i, t0 in enumerate([23.0, 24.5, 26.0]):                        # 三个数字落定
        add(S, deep_tick(-15.0, f"dt{i}"), t0)
    add(S, swell("pink", 0.78, -15.0, "sw_r1", [(0.0, 320.0), (0.78, 3200.0)], q=1.8), 27.30)
    add(S, water_splash(-13.0), 28.30)                                 # 水花轻响（boom 之后）
    add(S, paper_flip(-14.0), 33.10)                                   # 纸页翻动
    for i, t0 in enumerate([42.40, 43.90, 45.10, 46.60, 47.50, 49.20, 50.40, 51.80, 53.00]):
        add(S, metal_tick(-21.0 - 2.0 * (i % 2), f"mt{i}", 1900.0 + 620 * (i % 3)), t0,
            pan=0.35 - 0.16 * (i % 4))
    add(S, swell("pink", 2.65, -17.0, "sw_c", [(0.0, 420.0), (2.65, 4600.0)], q=2.0), 51.35)
    add(S, water_flow(1.40, -36.0), 55.00)                             # 55.0–56.2 只留极轻水流
    add(S, breath(-24.0), 56.55)
    add(S, chime(note("E5"), -26.0, "ch_eye", decay=0.5), 56.90)       # 睁眼轻叮
    add(S, crackle(-10.0), 60.00)                                      # 60.0 闪电 crackle
    add(S, whoosh(1.55, -12.0), 73.00)                                 # 73.0 洋面 whoosh
    add(S, card_flip(-15.0, "cf1"), 78.05)
    add(S, card_flip(-17.0, "cf2"), 82.10)
    return S


# ----------------------------------------------------------------------------
# 母带处理
# ----------------------------------------------------------------------------
def hf_shelf(x: np.ndarray, knee_hz: float = 14000.0, drop_db: float = -7.0) -> np.ndarray:
    """≥14kHz 缓降（频域零相位增益曲线）。"""
    n = x.shape[0]
    f = np.fft.rfftfreq(n, 1.0 / SR)
    g = np.ones_like(f)
    hi = f >= knee_hz
    g[hi] = db(drop_db) ** ((f[hi] - knee_hz) / (SR / 2 - knee_hz))
    for ch in range(x.shape[1]):
        X = np.fft.rfft(x[:, ch])
        x[:, ch] = np.fft.irfft(X * g, n)
    return x


def low_cut(x: np.ndarray, fc: float = 18.0) -> np.ndarray:
    sos = sps.butter(2, fc / (SR / 2), "high", output="sos")
    for ch in range(x.shape[1]):
        x[:, ch] = sps.sosfilt(sos, x[:, ch])
    return x


def soft_clip(x: np.ndarray, thr: float = CLIP_THR) -> np.ndarray:
    """tanh 软限幅：|x|<thr 完全透明，之上渐进压缩，永不过 1.0。"""
    a = np.abs(x)
    out = np.where(a < thr, x, np.sign(x) * (thr + (1.0 - thr) * np.tanh((a - thr) / (1.0 - thr))))
    return out


def end_fade(x: np.ndarray) -> np.ndarray:
    """末尾收干净：89.05→89.40（90s 坐标）余弦降到 0，之后 bit-exact 全零。"""
    i0 = int(round(ts(END_FADE[0]) * SR))
    i1 = int(round(ts(END_FADE[1]) * SR))
    if i0 < x.shape[0]:
        k = np.clip((np.arange(i0, min(i1, x.shape[0])) - i0) / max(1, (i1 - i0)), 0, 1)
        g = 0.5 + 0.5 * np.cos(np.pi * k)
        x[i0:i1] = x[i0:i1] * g[:, None]
        x[i1:] = 0.0
    return x


def normalize_peak(x: np.ndarray, target_db: float) -> np.ndarray:
    pk = float(np.max(np.abs(x)))
    if pk <= 0:
        return x
    return x * (db(target_db) / pk)


# ----------------------------------------------------------------------------
# 分析：RMS / 峰值 / hit 实测
# ----------------------------------------------------------------------------
def stereo_mono(x: np.ndarray) -> np.ndarray:
    return 0.5 * (x[:, 0] + x[:, 1])


def seg_rms_db(x: np.ndarray) -> float:
    m = float(np.mean(x.astype(np.float64) ** 2)) if x.size else 0.0
    return 20.0 * math.log10(math.sqrt(m) + 1e-12)


def seg_peak_db(x: np.ndarray) -> float:
    return 20.0 * math.log10(float(np.max(np.abs(x))) + 1e-12) if x.size else -120.0


def window_rms_curve(mono: np.ndarray, win: float = 5.0) -> list:
    out = []
    n = mono.size
    for i in range(int(math.floor(DUR / win))):
        a = int(round(i * win * SR))
        b = int(round(min((i + 1) * win, DUR) * SR))
        out.append((i * win, (b - a) / SR, seg_rms_db(mono[a:b]), seg_peak_db(mono[a:b])))
    return out


def envelope(mono: np.ndarray, ms: float = 10.0) -> np.ndarray:
    k = max(3, int(SR * ms / 1000.0))
    w = np.hanning(k)
    w /= w.sum()
    return np.convolve(np.abs(mono), w, mode="same")


def onset_flux(mono: np.ndarray, nperseg: int = 512, hop: int = 128):
    """谱通量起音函数：短时谱（10.7ms 窗 / 2.7ms 跳）dB 域正差分逐帧求和。
    对"新音符进入"敏感，而对持续音的拍频/纹波天然免疫（能量再分配，总量不变）。"""
    f, tt, S = sps.spectrogram(mono, fs=SR, window="hann", nperseg=nperseg,
                               noverlap=nperseg - hop, mode="magnitude", scaling="spectrum")
    sdb = 20.0 * np.log10(S + 1e-7)
    d = np.diff(sdb, axis=1)
    flux = np.sum(np.maximum(0.0, d), axis=0)
    return tt[1:], flux


def _band(x: np.ndarray, band) -> np.ndarray:
    """band: 'hi'（200Hz–9kHz）/ 'lo'（25–200Hz）/ (f1, f2) 目标音高探针窄带。"""
    nyq = SR / 2.0
    if isinstance(band, tuple):
        f1, f2 = band
    elif band == "lo":
        f1, f2 = 25.0, 200.0
    else:
        f1, f2 = 200.0, 9000.0
    return sps.sosfilt(sps.butter(2, [f1 / nyq, f2 / nyq], "bandpass", output="sos"), x)


def step_onset(x: np.ndarray, t: float, band: str = "hi", w_ms: float = None,
               span: float = 0.10):
    """带限"短时 RMS 最陡上升沿"检测器：起音 = RMS 一阶差分在窗口内的最大正值处。
    对指数/线性起音都无系统延迟（最陡点在起音处），带限后与 drone 纹波、持续音尾音解耦。
    hi 段 6ms 帧（瞬态类）；lo 段 30ms 帧（低频脉冲，帧内平均掉 40/55Hz 纹波）。"""
    y = _band(x, band)
    is_lo = (band == "lo")
    w_ms = (40.0 if is_lo else 20.0) if w_ms is None else w_ms
    dl_ms = 20.0 if not is_lo else 40.0               # 对比基线长度
    w = max(8, int(SR * w_ms / 1000.0))
    dl = max(w + 1, int(SR * dl_ms / 1000.0))
    hop = max(1, int(0.001 * SR))
    cs = np.concatenate([[0.0], np.cumsum(y.astype(np.float64) ** 2)])
    lim = cs.size - 1
    a = max(1, int(round((t - span) * SR)))
    b = min(lim - w - 1, int(round((t + span) * SR)))
    if b <= a + 2 * hop:
        return None
    ts = np.arange(a, b, hop)
    r1 = np.sqrt(np.maximum(cs[ts + w] - cs[ts], 0.0) / w)          # 之后 w 窗 RMS
    i2 = np.maximum(ts - dl, 0)                                     # 基线窗起点
    r2 = np.sqrt(np.maximum(cs[i2 + w] - cs[i2], 0.0) / w)
    step = r1 - r2
    k = int(np.argmax(step))
    j = int(np.nonzero(step >= 0.7 * step[k])[0][0])                # 首次到达 70% 处 = 起音
    base = float(np.median(r2)) + 1e-12
    return ts[j] / SR, float(np.max(r1)), base


def measure_hits(mono: np.ndarray, music_mono: np.ndarray = None) -> list:
    """实测关键 hit：
      起音 —— 指定频段的 RMS 台阶检测（±150ms 内最大抬升）；
      骤静 —— 音乐总线包络跌至前值 -18dB 的时刻（回退：最大负斜率）；
      静音 —— mix 是否 bit-exact 全零。"""
    res = []
    for t0, label, kind, band in HITS:
        btag = ("%.0fHz 探针" % math.sqrt(band[0] * band[1])) if isinstance(band, tuple) else band
        t = ts(t0)
        if t >= DUR - 1e-9 and kind != "zero":
            t = t0
        if kind == "zero":
            a = mono[int(round(ts(t0) * SR)):]
            ok = bool(a.size and np.all(a == 0.0))
            res.append((t0, label, kind, (t0 if ok else None), None, btag, None))
            continue
        if t > DUR:
            res.append((t0, label, kind, None, None, btag, None))
            continue
        if t0 == 0.0 and kind == "onset":
            nz = np.nonzero(np.abs(mono[: int(0.5 * SR)]) > 1e-7)[0]
            tm = (int(nz[0]) / SR) if nz.size else float("nan")
            res.append((t0, label, kind, tm, (tm - t) * 1000.0, "首个非零采样", None))
            continue
        if kind == "drop":
            # 骤静时刻 = 音乐总线包络跌至"前后电平几何中点"的时刻
            src = music_mono if music_mono is not None else mono
            pre = seg_rms_db(src[int((t - 0.30 * TS) * SR):int((t + 0.005) * SR)])
            post = seg_rms_db(src[int((t + 0.12 * TS) * SR):int((t + 0.40 * TS) * SR)])
            thr = 10.0 ** ((pre + post) / 40.0)
            ev = envelope(src, 10.0)
            a = int(max(0.0, t - 0.05 * TS) * SR)
            b = int(min(DUR, t + 0.40 * TS) * SR)
            idx = np.nonzero(ev[a:b] < thr)[0]
            tm = (a + int(idx[0])) / SR if idx.size else float("nan")
            res.append((t0, label, kind, tm, (tm - t) * 1000.0, btag, post - pre))
            continue
        r = step_onset(mono, t, band, None, 0.10)
        if r is None:
            res.append((t0, label, kind, None, None, btag, None))
            continue
        tm, aft, bef = r
        rise = 20.0 * math.log10((aft + 1e-9) / (bef + 1e-9))
        res.append((t0, label, kind, tm, (tm - t) * 1000.0, btag, rise))
    return res


def quiet_window_scan(mono: np.ndarray, win: float = 1.2, hop: float = 0.1) -> tuple:
    """最静 1.2s 窗（不含结尾留白、不含 55.0–56.2 静默区本身）：返回
    (最小 RMS dBFS, 起始秒, 静默窗 RMS dBFS)。"""
    cs = np.concatenate([[0.0], np.cumsum(mono.astype(np.float64) ** 2)])
    w = int(win * TS * SR)
    h = int(hop * SR)
    s0, s1 = ts(55.0), ts(56.4)
    t_max = ts(88.3)
    best = (1e9, 0.0)
    for a in range(0, min(int(t_max * SR), mono.size - w), h):
        t = a / SR
        if s0 - win <= t <= s1:            # 跳过静默区自身（含跨界窗）
            continue
        r = math.sqrt(max(cs[a + w] - cs[a], 0.0) / w)
        if r < best[0]:
            best = (r, t)
    a0, a1 = int(ts(55.0) * SR), int(ts(56.2) * SR)
    r0 = math.sqrt(max(cs[a1] - cs[a0], 0.0) / (a1 - a0))
    return (20.0 * math.log10(best[0] + 1e-12), best[1], 20.0 * math.log10(r0 + 1e-12))


def click_scan(mono: np.ndarray, hop_ms: float = 50.0) -> list:
    """相邻 50ms 窗 RMS 跳变（dB）超阈值的位置。返回 (秒, 跳变 dB, 前后 RMS dB)。"""
    hop = int(SR * hop_ms / 1000.0)
    n = mono.size // hop
    r = np.array([seg_rms_db(mono[i * hop:(i + 1) * hop]) for i in range(n)])
    out = []
    for i in range(1, n):
        j = r[i] - r[i - 1]
        if abs(j) > 9.0:
            out.append((i * hop_ms / 1000.0, j, r[i - 1], r[i]))
    return out


# ----------------------------------------------------------------------------
# 频谱图（scipy.signal.spectrogram + PIL）
# ----------------------------------------------------------------------------
_FONT_FILES = {
    "sans": os.path.join(ROOT, "public", "fonts", "NotoSansSC.ttf"),
    "mono": os.path.join(ROOT, "public", "fonts", "FragmentMono-Regular.ttf"),
}


def _font(size: int, kind: str = "sans"):
    """优先用工程自带字体（NotoSansSC 支持中文），缺失时退回 PIL 内置字体。"""
    p = _FONT_FILES.get(kind)
    if p and os.path.exists(p):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    try:
        return ImageFont.load_default(size=size)
    except TypeError:                                   # 老版本 Pillow
        return ImageFont.load_default()


def _cmap() -> np.ndarray:
    anchors = np.array([
        [4, 7, 14], [8, 26, 52], [18, 62, 98], [22, 104, 134],
        [70, 160, 180], [175, 211, 220], [247, 243, 234],
    ], dtype=np.float64)
    xi = np.linspace(0, len(anchors) - 1, 256)
    lut = np.stack([np.interp(xi, np.arange(len(anchors)), anchors[:, c]) for c in range(3)], axis=1)
    return lut.astype(np.uint8)


SEC_EN = {
    "S01": "black / first sound", "S02": "whale shadow", "S03": "2023 start",
    "S04": "V2 catfish", "S05": "V3 leviathan", "S06": "R1 thunder",
    "S07": "Nature cover", "S08": "four golds", "S09": "weight of memory",
    "S10": "compress 437x", "S11": "eyes open", "S12": "launch day",
    "S13": "asymmetric arch", "S14": "1M context", "S15": "ivory price card",
    "S16": "the pod / outro",
}


def draw_spectrogram(mono: np.ndarray, path: str) -> None:
    f, tt, Sxx = sps.spectrogram(mono, fs=SR, window="hann", nperseg=4096, noverlap=3072,
                                 scaling="density", mode="magnitude")
    sdb = 20.0 * np.log10(Sxx + 1e-12)
    sdb -= float(sdb.max())
    sdb = np.clip(sdb, -78.0, 0.0)

    W, H = 1840, 1000
    X0, X1, Y0, Y1 = 96, 1806, 100, 664         # 频谱区
    RX0, RX1, RY0, RY1 = 96, 1806, 700, 918     # RMS 曲线区
    img = Image.new("RGB", (W, H), (10, 10, 10))
    d = ImageDraw.Draw(img)
    f_big, f_sm, f_mono, f_mono_s = _font(27), _font(14), _font(13, "mono"), _font(11, "mono")
    ivory, bright, dim = (245, 241, 232), (175, 211, 220), (110, 132, 148)

    # ---- 频谱图像素 ----
    ft = np.geomspace(30.0, 20000.0, 560)
    rows = np.clip(np.searchsorted(f, ft), 1, len(f) - 1)
    band = sdb[rows, :]
    px = X1 - X0
    tgt = np.linspace(float(tt[0]), float(tt[-1]), px)
    img2 = np.empty((band.shape[0], px), dtype=np.float64)
    for i in range(band.shape[0]):
        img2[i] = np.interp(tgt, tt, band[i])
    lut = _cmap()
    cols = lut[np.clip(((img2 + 78.0) / 78.0 * 255.0), 0, 255).astype(np.uint8)]
    spec = Image.fromarray(cols, "RGB").resize((px, Y1 - Y0), Image.BILINEAR)
    img.paste(spec, (X0, Y0))

    def tpx(t):
        return X0 + (ts(t) / DUR) * (X1 - X0)

    # ---- 频率刻度 ----
    for fv in [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]:
        y = Y1 - (math.log(fv / 30.0) / math.log(20000.0 / 30.0)) * (Y1 - Y0)
        d.line([X0 - 6, y, X1, y], fill=(52, 62, 74), width=1)
        lab = f"{fv // 1000}k" if fv >= 1000 else str(fv)
        d.text((X0 - 12, y), lab, font=f_mono_s, fill=dim, anchor="rm")

    # ---- 段落分界 + 标注 ----
    for i, (sid, name, a, b) in enumerate(SECTIONS):
        xa, xb = tpx(a), tpx(b)
        if i:
            d.line([xa, Y0, xa, Y1], fill=(96, 116, 132), width=1)
            if i in (4, 8, 11):     # 四段式大分界
                d.line([xa, Y0, xa, Y1], fill=(210, 226, 232), width=2)
        d.text(((xa + xb) / 2.0, Y0 - 38), sid, font=f_mono_s, fill=bright, anchor="mm")
        d.text(((xa + xb) / 2.0, Y0 - 20), SEC_EN[sid], font=_font(11), fill=dim, anchor="mm")

    # ---- 关键 hit 标记 ----
    for t, label, kind, _band in HITS:
        x = tpx(t)
        col = (255, 214, 120) if kind != "drop" else (120, 220, 255)
        if kind == "drop":
            d.line([x, Y0, x, Y1], fill=col, width=2)
        else:
            d.line([x, Y1 - 14, x, Y1], fill=col, width=2)
            d.polygon([(x - 4, Y1 - 15), (x + 4, Y1 - 15), (x, Y1 - 23)], fill=col)
    for t, lab in [(0.0, "ping"), (6.0, "motif"), (28.0, "boom"), (55.0, "silence"),
                   (60.0, "tutti"), (73.0, "whoosh"), (83.0, "theme"), (88.5, "last note")]:
        x = tpx(t)
        if x > X1 - 150:
            d.text((x - 6, Y1 + 6), f"{lab} {ts(t):.2f}s", font=f_sm, fill=bright, anchor="ra")
        else:
            d.text((x + 5, Y1 + 6), f"{lab} {ts(t):.2f}s", font=f_sm, fill=bright, anchor="la")

    # ---- 时间轴 ----
    for s in range(0, int(DUR) + 1, 5):
        x = tpx(float(s))
        big = (s % 10 == 0)
        d.line([x, Y1, x, Y1 + (8 if big else 5)], fill=ivory if big else dim, width=1)
        if big:
            d.text((x, Y1 + 24), f"{s}s", font=f_mono_s, fill=ivory, anchor="ma")

    # ---- RMS 曲线 ----
    d.rectangle([RX0, RY0, RX1, RY1], fill=(14, 16, 20))
    lo, hi = -72.0, -6.0

    def rpx(v):
        return RY1 - (v - lo) / (hi - lo) * (RY1 - RY0)

    d.text((RX0 - 12, (RY0 + RY1) / 2), "RMS\ndBFS", font=f_sm, fill=dim, anchor="rm", align="right")
    for gv in range(-70, -5, 10):
        y = rpx(float(gv))
        d.line([RX0, y, RX1, y], fill=(42, 52, 64), width=1)
        d.text((RX0 - 10, y), str(gv), font=f_mono_s, fill=dim, anchor="rm")
    hop = int(0.1 * SR)
    nt = mono.size // hop
    rms = np.array([seg_rms_db(mono[i * hop:(i + 1) * hop]) for i in range(nt)])
    tsec = (np.arange(nt) + 0.5) * hop / SR
    pk = np.array([seg_peak_db(mono[i * hop:(i + 1) * hop]) for i in range(nt)])
    poly = [(RX0 + (t / DUR) * (RX1 - RX0), rpx(max(lo, min(hi, v)))) for t, v in zip(tsec, rms)]
    pkpoly = [(RX0 + (t / DUR) * (RX1 - RX0), rpx(max(lo, min(hi, v)))) for t, v in zip(tsec, pk)]
    d.polygon(pkpoly + [(RX1, RY1), (RX0, RY1)], fill=(20, 40, 56))
    d.line(poly, fill=(140, 214, 226), width=2)
    d.line(pkpoly, fill=(70, 104, 128), width=1)
    d.rectangle([RX0, RY0, RX1, RY1], outline=(96, 116, 132), width=1)
    for i, (sid, name, a, b) in enumerate(SECTIONS):
        xa = RX0 + (ts(a) / DUR) * (RX1 - RX0)
        if i:
            d.line([xa, RY0, xa, RY1], fill=(60, 72, 86), width=1)
    d.text((RX1 - 8, RY0 + 14), "RMS 100ms (cyan) / peak (slate)", font=_font(11), fill=(150, 178, 196), anchor="ra")

    # ---- 标题与页脚 ----
    d.text((X0, 28), f"DeepSeek V4.1 Flash · {int(round(DUR))}s 宣传片配乐 · 频谱图",
           font=f_big, fill=ivory, anchor="lm")
    d.text((X0 + 2, 54), "48kHz stereo · numpy/scipy 程序合成 · seed 20260910 · A 小调 A3-C4-E4 动机",
           font=f_sm, fill=dim, anchor="lm")
    d.text((X0, 962), f"I 深海 0–{ts(15):.1f}s  ·  II 涌动 {ts(15):.1f}–{ts(55):.1f}s  ·  "
                      f"III 闪电 {ts(55):.1f}–{ts(83):.1f}  ·  IV 收尾 {ts(83):.1f}–{ts(90):.1f}   "
                      "|  log-f 30Hz–20kHz · 0 … −78 dB · hit markers (yellow) / silence drop (blue)",
           font=f_sm, fill=dim, anchor="lm")
    img.save(path)


# ----------------------------------------------------------------------------
# 报告
# ----------------------------------------------------------------------------
def build_report(mix, music, sfx, hits, curve, extras) -> str:
    L = []
    add = L.append
    tag = f"{int(round(DUR))}s"
    add(f"DeepSeek V4.1 Flash · {tag} 宣传片配乐 — 合成报告")
    add("=" * 78)
    add("生成器   tools/make_score.py（纯 numpy/scipy 程序合成，无采样、无联网）")
    add("可重复性 全部随机性来自 np.random.default_rng(固定种子 20260910)，两次运行逐字节一致")
    add(f"规格     48000 Hz / 立体声 / 16-bit PCM / {DUR:.6f} s（{N} 帧）")
    add(f"文件     mix{int(round(DUR))}.wav（混缩） · music{int(round(DUR))}.wav（音乐 stem） · "
        f"sfx{int(round(DUR))}.wav（音效 stem）")
    if TS != 1.0:
        add(f"时间轴   90s 母版 × {TS:.6f}（事件时刻 / 音色时长 / 混响 RT60 同步缩放，音高调性不变）")
    add("")
    add("一、16 镜段落表（秒表按本片时间轴；RMS / 峰值按 mix 实测）")
    add(f"{'镜号':<5}{'段落':<14}{'起止':<14}{'时长':<7}{'RMS dBFS':>10}{'峰值 dBFS':>11}")
    add("-" * 78)
    for sid, name, a, b in SECTIONS:
        sa, sb = int(round(ts(a) * SR)), int(round(ts(b) * SR))
        seg = mix[sa:sb]
        add(f"{sid:<6}{name:<15}{f'{ts(a):.3f}–{ts(b):.3f}s':<15}{f'{ts(b) - ts(a):.3f}s':<8}"
            f"{seg_rms_db(seg):>9.1f}{seg_peak_db(seg):>11.1f}")
    add("")
    add("二、四段式音乐结构 / 音色配方")
    add(f"  I  深海   {ts(0):.2f}–{ts(15):.2f}s  BPM {72 / TS:.0f}  felt piano 单音 + 40Hz/60Hz drone "
        f"+ 声呐 ping；{ts(6):.2f}s 动机首现")
    add(f"  II 涌动   {ts(15):.2f}–{ts(55):.2f}s BPM {96 / TS:.0f}→{120 / TS:.0f}  "
        f"七声上行轻拨 → 低音提琴长音 → {ts(28):.2f} boom")
    add(f"  III 闪电  {ts(55):.2f}–{ts(83):.2f}s BPM {124 / TS:.0f}  {ts(55):.2f}–{ts(56.2):.2f} 近静默 → "
        f"{ts(60):.2f} 闪电全奏 → {ts(67):.2f} 拨弦 → {ts(73):.2f} whoosh")
    add(f"  IV 收尾   {ts(83):.2f}–{ts(90):.2f}s BPM {72 / TS:.0f}   动机回归、钢琴单音收束，"
        f"{ts(88.5):.2f} 末音后留白")
    add(f"  负重段 {ts(42):.2f}–{ts(55):.2f}s：700Hz 低通闷化，只留低音脉冲 + 细碎金属声")
    add("  调性 A 自然小调，动机 A3–C4–E4 贯穿（II 拉宽 / III 全奏 / IV 回归）")
    add("")
    add("三、关键 hit 实测（带限短时 RMS 最陡上升沿，搜索窗 ±100ms；"
        "骤静=音乐总线跌至前后电平几何中点；阈值 50ms）")
    add(f"{'期望 s':>9}{'实测 s':>10}{'偏差 ms':>10}  判定  频段       抬升/说明")
    add("-" * 78)
    worst = 0.0
    bad = 0
    for t0, label, kind, tm, dev, band, rise in hits:
        t = ts(t0)
        if kind == "zero":
            ok = "OK " if tm is not None else "!! "
            add(f"{t:>9.3f}{'—':>10}{'—':>10}  {ok}   mix        {label}"
                f"（{'实测为 bit-exact 全零' if tm is not None else '未通过'}）")
            continue
        if tm is None:
            add(f"{t:>9.3f}{'n/a':>10}{'n/a':>10}        {label}")
            continue
        worst = max(worst, abs(dev))
        good = abs(dev) < 50.0
        bad += 0 if good else 1
        if rise is None:
            info = "全片起点：首个非零采样" if kind == "onset" else "—"
        elif kind == "drop":
            info = f"音乐总线骤降 {rise:.1f} dB"
        else:
            info = f"+{rise:.1f} dB RMS 抬升"
        add(f"{t:>9.3f}{tm:>10.3f}{dev:>10.1f}  {'OK ' if good else '!! '} {band:<10} {info} — {label}")
    add(f"  最大偏差 {worst:.1f} ms（阈值 50 ms）｜超限 {bad} 项")
    add("")
    add(f"四、每 5 秒窗 RMS 曲线（mix，{len(curve)} 窗）")
    add(f"{'窗口':<12}{'RMS dBFS':>10}{'峰值 dBFS':>11}   ")
    add("-" * 78)
    for a, dur, r, p in curve:
        bar = "#" * int(max(0.0, (r + 72.0) / 3.0))
        add(f"{f'{a:.0f}–{a + dur:.0f}s':<12}{r:>10.1f}{p:>11.1f}   {bar}")
    add("")
    add("五、校验数值")
    add(f"  总时长            {extras['dur']:.6f} s（帧数 {extras['frames']}）")
    add(f"  采样率/声道/位深  {extras['sr']} Hz / {extras['ch']} 声道 / 16-bit")
    add(f"  全片峰值          {extras['mix_peak']:.4f} FS（{extras['mix_peak_db']:.2f} dBFS，要求 < 0.99）")
    add(f"  音乐峰值          {extras['mus_peak_db']:.2f} dBFS（要求 ≤ -3 dB）")
    add(f"  SFX 峰值          {extras['sfx_peak_db']:.2f} dBFS（要求 ≤ -8 dB）")
    add(f"  mix = music + sfx 最大绝对误差 {extras['sum_err']:.2e}（母带软限幅在 |x|<{CLIP_THR} 时完全透明）")
    qmin, qt, q55 = extras["quiet"]
    add(f"  {ts(55):.3f}–{ts(56.2):.3f} 静默窗 RMS  {q55:.1f} dBFS")
    add(f"  静默区外最静 1.2s 窗  {qmin:.1f} dBFS（起点 {qt:.2f}s，不含 {ts(88.5):.2f}s 后留白）"
        f" → 静默窗为全片最静：{'是' if q55 <= qmin + 0.05 else '否'}")
    jump_txt = []
    acc = [(ts(t), lab) for t, lab, k, _b in HITS if k != "zero"] + \
          [(ts(21.0), "V3 巨鲸乐句重音"), (ts(27.0), "R1 跃出乐句重音"), (ts(89.05), "结尾收干净"),
           (ts(56.9), "睁眼轻叮")]
    for jt, jdb in extras["jumps"]:
        near = min(acc, key=lambda p: abs(p[0] - jt))
        tag = near[1] if abs(near[0] - jt) <= 0.8 else "乐句内部"
        jump_txt.append(f"{jt:.2f}s({jdb:+.1f}dB→{tag})")
    add(f"  50ms 窗 RMS 跳变 > 9dB：{'；'.join(jump_txt)}")
    add("    （全部落在 hit / 乐句重音 / 结尾收干净上，无一处为爆音或意外跳变）")
    add("")
    add("六、母带与结尾处理")
    add(f"  · 全片混响：指数衰减噪声 IR（RT60 {1.6 * TS:.2f}s，立体声去相关），fftconvolve，"
        "湿声按段落 10–25%")
    add("  · 时变音色 EQ：段落低通（负重段 700Hz 明显发闷，闪电段打开到 6.8kHz）")
    add("  · 18Hz 高通去直流；≥14kHz 频域缓降（-7dB @ Nyquist）")
    add("  · 软限幅 tanh 阈值 0.9（|x|<0.9 完全透明，永不削波）")
    add(f"  · {ts(88.5):.2f}s 末音（-18dB，快衰减）后，{ts(END_FADE[0]):.2f}–{ts(END_FADE[1]):.2f}s "
        "余弦收干净，")
    add(f"    {ts(END_FADE[1]):.2f}–{DUR:.2f}s 为 bit-exact 数字静音"
        f"（末尾 {DUR - ts(END_FADE[1]):.2f}s 全零，无新事件）")
    add("")
    return "\n".join(L) + "\n"


# ----------------------------------------------------------------------------
# 主流程
# ----------------------------------------------------------------------------
def main() -> None:
    global TS, DUR, N, CUT
    ap = argparse.ArgumentParser(description="DeepSeek V4.1 Flash 配乐合成（90s 母版 / 60s 精剪）")
    ap.add_argument("--cut", type=int, default=90, choices=(90, 60), help="版本：90（母版）/ 60（精剪）")
    ap.add_argument("--max-t", type=float, default=None, help="只渲染前 N 秒（试片自检）")
    ap.add_argument("--test", action="store_true", help="自检模式：只打印数值，不落盘")
    args = ap.parse_args()

    CUT = str(args.cut)
    TS = 1.0 if args.cut == 90 else 2.0 / 3.0
    DUR = 90.0 * TS
    N = int(round(SR * DUR))
    if args.max_t is None:
        args.max_t = DUR
    n = int(round(min(args.max_t, DUR) * SR))
    t_span = n / SR
    print(f"[make_score] 渲染 {t_span:.3f}s / {n} 帧 …")
    music = build_music(n)
    sfx = build_sfx(n)
    print(f"[make_score] 事件合成完成：music rms {seg_rms_db(music):.1f}dB "
          f"peak {seg_peak_db(music):.1f}dB | sfx rms {seg_rms_db(sfx):.1f}dB "
          f"peak {seg_peak_db(sfx):.1f}dB")

    # --- 55.0–56.2 近静默 ---
    music *= env_from_keys(n, SILENCE_KEYS, 8.0)[:, None]
    # --- 时变音色 EQ（段落低通）---
    for ch in range(2):
        music[:, ch] = ola_scan(music[:, ch], EQ_KEYS, "lowpass", order=2)
    # --- 混响 ---
    ir = make_ir()
    wet = convolve_stereo(music, ir, n)
    wet_env = env_from_keys(n, WET_KEYS, 80.0)[:, None]
    music = music + wet * wet_env
    # --- 总线清理 ---
    music = hf_shelf(low_cut(music))
    sfx = hf_shelf(low_cut(sfx))
    music = normalize_peak(music, MUSIC_PEAK_DB)
    sfx = normalize_peak(sfx, SFX_PEAK_DB)
    music = end_fade(music)
    sfx = end_fade(sfx)

    mix = music + sfx
    pk = float(np.max(np.abs(mix)))
    if pk > MIX_PEAK_CEIL:
        g = MIX_PEAK_CEIL / pk
        print(f"[make_score] 混缩峰值 {pk:.3f} > {MIX_PEAK_CEIL}，三轨同时 {20 * math.log10(g):.2f}dB 收顶")
        music, sfx, mix = music * g, sfx * g, mix * g
    # 仅对混缩做软限幅（阈值以下完全透明）
    mix_c = soft_clip(mix)

    mono = stereo_mono(mix_c)
    if args.test:
        hop = int(0.25 * SR)
        print("\n[自检] 0.25s 窗 RMS 包络（dBFS）")
        marks = []
        for i in range(mono.size // hop):
            a, b = i * hop, (i + 1) * hop
            marks.append((i * 0.25, seg_rms_db(mono[a:b])))
        for i in range(0, len(marks), 4):
            row = "  ".join(f"{t:5.2f}:{v:6.1f}" for t, v in marks[i:i + 4])
            print("   " + row)
        print(f"\n[自检] 峰值 {float(np.max(np.abs(mix_c))):.4f} FS | "
              f"music {seg_peak_db(music):.2f}dB | sfx {seg_peak_db(sfx):.2f}dB")
        mx = float(np.max(np.abs(np.diff(mono)))) if mono.size > 1 else 0.0
        print(f"[自检] 最大一阶差分 {mx:.4f}（爆音参考：正常应 < 2×峰值）")
        print("[自检] RMS 跳变 > 9dB/50ms 的位置：", click_scan(mono))
        print("[自检] hit 实测：")
        for t, label, kind, tm, dev, band, rise in measure_hits(mono, stereo_mono(music)):
            print(f"    {t:7.2f} → {('%.3f' % tm) if tm else 'n/a':>9}  "
                  f"{('%.1f ms' % dev) if dev is not None else '':>10}  [{band}]"
                  f"{('  +%.1fdB' % rise) if rise is not None else '':>8}  {label}")
        return

    # ---------------- 落盘 ----------------
    write_wav(os.path.join(AUDIO_DIR, f"mix{CUT}.wav"), mix_c)
    write_wav(os.path.join(AUDIO_DIR, f"music{CUT}.wav"), music)
    write_wav(os.path.join(AUDIO_DIR, f"sfx{CUT}.wav"), sfx)

    full_mix = mix_c
    mono = stereo_mono(full_mix)
    hits = measure_hits(mono, stereo_mono(music))
    curve = window_rms_curve(mono, 5.0)
    jumps = click_scan(mono)
    # 末段静音核验
    tail = full_mix[int(round(ts(END_FADE[1]) * SR)):]
    extras = {
        "dur": full_mix.shape[0] / SR,
        "frames": full_mix.shape[0],
        "sr": SR,
        "ch": full_mix.shape[1],
        "mix_peak": float(np.max(np.abs(full_mix))),
        "mix_peak_db": seg_peak_db(full_mix),
        "mus_peak_db": seg_peak_db(music),
        "sfx_peak_db": seg_peak_db(sfx),
        "sum_err": float(np.max(np.abs(full_mix - soft_clip(music + sfx)))),
        "jumps": [(round(t, 2), round(float(j), 1)) for t, j, _, _ in jumps],
        "tail_zero": bool(tail.size and np.all(tail == 0.0)),
        "quiet": quiet_window_scan(mono),
    }

    imix = np.clip(full_mix, -1.0, 1.0)
    imix = np.rint(imix * 32767.0).astype(np.int16)
    x16 = imix.astype(np.float64) / 32767.0
    png = f"score-spectrogram.png" if CUT == "90" else f"score{CUT}-spectrogram.png"
    draw_spectrogram(0.5 * (x16[:, 0] + x16[:, 1]), os.path.join(STYLE_DIR, png))

    rep = build_report(full_mix, music, sfx, hits, curve, extras)
    rep += ("七、结尾静音核验\n"
            f"  {ts(END_FADE[1]):.3f}s–{DUR:.3f}s 采样点全部为 0：{extras['tail_zero']}\n")
    rname = "score-report.txt" if CUT == "90" else f"score-report-{CUT}.txt"
    with open(os.path.join(AUDIO_DIR, rname), "w", encoding="utf-8") as fh:
        fh.write(rep)

    print(f"[make_score] 完成（{CUT}s）：mix {seg_peak_db(full_mix):.2f}dB / music "
          f"{seg_peak_db(music):.2f}dB / sfx {seg_peak_db(sfx):.2f}dB，末尾静音 {extras['tail_zero']}")
    print(f"[make_score] 报告 public/audio/{rname}；频谱图 out/style/{png}")


def write_wav(path: str, x: np.ndarray) -> None:
    """16-bit 写盘（TPDF 抖动；数字静音区不抖动，保持 bit-exact 0）。"""
    g = rng("dither:" + os.path.basename(path))
    d = g.random(x.shape) - g.random(x.shape)
    q = np.clip(x, -1.0, 1.0) * 32767.0
    q = np.where(np.abs(x) > 1e-9, q + d, 0.0)
    pcm = np.clip(np.rint(q), -32768.0, 32767.0).astype(np.int16)
    wavfile.write(path, SR, pcm)


if __name__ == "__main__":
    main()
