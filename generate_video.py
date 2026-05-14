"""
LiquidityAlert — 60-second Explainer Video Generator
1920x1080, 24fps, MP4/H.264
"""

import math
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy import VideoClip

# ── Constants ────────────────────────────────────────────────────────────────
WIDTH, HEIGHT = 1920, 1080
FPS = 24
DURATION = 60.0

BG     = (10,  10,  10)
GREEN  = (0,  255,  65)   # #00ff41
CYAN   = (0,  212, 255)   # #00d4ff
BULL   = (0,  255, 136)   # #00ff88
BEAR   = (255,  51,  51)  # #ff3333
WHITE  = (255, 255, 255)
DIM_G  = (0,   40,  15)

FONT_MONO      = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FONT_MONO_BOLD = "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf"

_font_cache: dict = {}

def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    key = (size, bold)
    if key not in _font_cache:
        try:
            path = FONT_MONO_BOLD if bold else FONT_MONO
            _font_cache[key] = ImageFont.truetype(path, size)
        except Exception:
            _font_cache[key] = ImageFont.load_default()
    return _font_cache[key]


# ── Helpers ───────────────────────────────────────────────────────────────────
def clamp_color(r, g=None, b=None):
    if g is None:
        # r is a tuple
        return tuple(max(0, min(255, int(c))) for c in r)
    return (max(0, min(255, int(r))),
            max(0, min(255, int(g))),
            max(0, min(255, int(b))))


def fade(color, alpha: float):
    return clamp_color(c * alpha for c in color)


def blend_img(base: Image.Image, overlay_color, alpha: float) -> Image.Image:
    """Blend base with a solid-color overlay."""
    ov = Image.new("RGB", base.size, clamp_color(overlay_color))
    return Image.blend(base, ov, max(0.0, min(1.0, alpha)))


def scanlines(draw: ImageDraw.ImageDraw, t: float, opacity: float = 0.03):
    step = 4
    for y in range(0, HEIGHT, step):
        brightness = int(25 * opacity * (0.7 + 0.3 * math.sin(y * 0.05 + t * 1.5)))
        draw.line([(0, y), (WIDTH, y)], fill=(0, brightness, 0), width=1)


def typewriter(draw: ImageDraw.ImageDraw, text: str, x: int, y: int,
               fnt, color, elapsed: float, cps: float = 22.0,
               cursor_color=None):
    n = int(elapsed * cps)
    shown = text[:n]
    draw.text((x, y), shown, font=fnt, fill=clamp_color(color))
    if n < len(text) and int(elapsed * 2) % 2 == 0:
        if shown:
            w = fnt.getbbox(shown)[2]
        else:
            w = 0
        draw.text((x + w, y), "█", font=fnt,
                  fill=clamp_color(cursor_color or color))


# ── Scene 1 — Boot Sequence  (0 – 5 s) ───────────────────────────────────────
def scene1(t: float) -> np.ndarray:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    fnt = font(38, bold=True)

    lines = [
        ("> LIQUIDITYALERT_SYSTEM_V3.2", GREEN,  0.0),
        ("> CONNECTING_ALPHA_NODE...",   CYAN,   1.4),
        ("> ALPHA_NODE_ACTIVE ●",        GREEN,  3.0),
    ]

    start_y = HEIGHT // 2 - 70
    for i, (text, color, delay) in enumerate(lines):
        et = max(0.0, t - delay)
        if et > 0:
            typewriter(draw, text, 200, start_y + i * 56, fnt, color, et, cps=24)

    # Scanline sweep
    sweep = int(t / 5.0 * HEIGHT * 1.5) % (HEIGHT + 60)
    for dy in range(4):
        sy = sweep - dy
        if 0 <= sy < HEIGHT:
            draw.line([(0, sy), (WIDTH, sy)],
                      fill=(0, max(0, 55 - dy * 14), 0), width=1)

    scanlines(draw, t, 0.025)
    return np.array(img)


# ── Scene 2 — The Problem  (5 – 18 s, local 0 – 13 s) ────────────────────────
def scene2(t: float) -> np.ndarray:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    mid_x = WIDTH // 2
    fnt_lg = font(44, bold=True)

    # ── Left: chaotic candles ──
    left_fade = max(0.0, 1.0 - max(0.0, t - 7.5) / 2.5)

    if left_fade > 0:
        rng_base = random.Random(777)
        n_candles = 22
        cw = (mid_x - 80) // n_candles
        for i in range(n_candles):
            seed = int(t * 8) * 31 + i * 13
            rng = random.Random(seed)
            x = 40 + i * cw
            is_bull = rng.random() > 0.5
            bh = int(rng.uniform(40, 180))
            wt = int(rng.uniform(15, 55))
            wb = int(rng.uniform(15, 55))
            cy = int(rng.uniform(180, HEIGHT - 200))
            base_c = BULL if is_bull else BEAR
            c = fade(base_c, left_fade * 0.9)
            cx = x + cw // 2
            draw.line([(cx, cy - wt), (cx, cy + bh + wb)], fill=c, width=2)
            draw.rectangle([(x + 2, cy), (x + cw - 2, cy + bh)], fill=c)

        # Chaotic indicator lines
        for k in range(6):
            rng2 = random.Random(k * 37 + int(t * 5))
            pts, px, py = [], 40, rng2.randint(80, HEIGHT - 80)
            for _ in range(18):
                pts.append((px, py))
                px += (mid_x - 80) // 18
                py = max(40, min(HEIGHT - 40, py + rng2.randint(-90, 90)))
            ic = (int(rng2.randint(80, 255) * left_fade),
                  int(rng2.randint(40, 180) * left_fade),
                  int(rng2.randint(40, 180) * left_fade))
            for j in range(len(pts) - 1):
                draw.line([pts[j], pts[j+1]], fill=ic, width=2)

        nf = font(22)
        draw.text((50, 40), "MARKET_NOISE.EXE",
                  font=nf, fill=fade(BEAR, left_fade * 0.8))

    # ── Right: clean pulsing dot ──
    if t < 8:
        dot_x = mid_x + (WIDTH - mid_x) // 2
    else:
        dot_x = WIDTH // 2
    dot_y = HEIGHT // 2
    dot_r = 9
    if t > 10.5:
        dot_r = int(9 + min(1.0, (t - 10.5) / 2.0) * 70)
    pulse = 1.0 + 0.28 * math.sin(t * math.pi * 2)
    ar = int(dot_r * pulse)
    for ring in range(5, 0, -1):
        rr = ar + ring * 16
        lum = max(0, 22 - ring * 4)
        draw.ellipse([(dot_x - rr, dot_y - rr), (dot_x + rr, dot_y + rr)],
                     fill=(0, lum, 0))
    draw.ellipse([(dot_x - ar, dot_y - ar), (dot_x + ar, dot_y + ar)],
                 fill=GREEN)

    # ── Dividing line ──
    if left_fade > 0:
        lc = fade(GREEN, left_fade * 0.25)
        draw.line([(mid_x, 0), (mid_x, HEIGHT)], fill=lc, width=1)

    # ── Center text overlay: 2.5 s → 8 s ──
    if t > 2.5:
        ta = min(1.0, (t - 2.5) / 1.2)
        if t > 8.5:
            ta *= max(0.0, 1.0 - (t - 8.5) / 1.5)
        line1 = "THE MARKET GENERATES NOISE."
        line2 = "WE EXTRACT THE SIGNAL."
        bb1 = fnt_lg.getbbox(line1)
        bb2 = fnt_lg.getbbox(line2)
        tw = max(bb1[2], bb2[2])
        tx = WIDTH // 2 - tw // 2
        ty = HEIGHT // 2 - 65
        # bg band
        ov = Image.new("RGB", (tw + 48, 140), BG)
        img.paste(ov, (tx - 24, ty - 12))
        draw = ImageDraw.Draw(img)
        draw.text((tx, ty),      line1, font=fnt_lg,
                  fill=fade(WHITE, ta))
        draw.text((tx, ty + 62), line2, font=fnt_lg,
                  fill=fade(GREEN, ta))

    scanlines(draw, t, 0.018)
    return np.array(img)


# ── Scene 3 — What Is LiquidityAlert  (18 – 35 s, local 0 – 17 s) ─────────────
def scene3(t: float) -> np.ndarray:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    fnt_hd  = font(26, bold=True)
    fnt_lbl = font(22, bold=True)
    fnt_val = font(22, bold=True)
    fnt_bar = font(20)
    fnt_txt = font(24)
    fnt_sm  = font(18)

    ha = min(1.0, t / 0.4)
    draw.text((80, 45), "LIQUIDITYALERT_TERMINAL_V3.2",
              font=fnt_hd, fill=fade(GREEN, ha))
    draw.text((WIDTH - 340, 45), "STATUS: ACTIVE ●",
              font=fnt_sm, fill=fade(GREEN, ha))
    draw.line([(80, 88), (WIDTH - 80, 88)], fill=(0, 50, 18), width=1)

    metrics = [
        ("TVL_24H",      8, 10, "+3.2%",    GREEN,  0.30),
        ("STITCH_SCORE", 7,  3, "74 / 100", CYAN,   0.90),
        ("NET_LIQ",      9,  1, "+2.1T",    BULL,   1.50),
        ("DXY_INDEX",    3,  7, "99.4  ↓",  BEAR,   2.10),
        ("BTC_PRICE",    9,  1, "$104,200", GREEN,  2.70),
    ]

    my = 118
    for (label, filled, empty, value, color, delay) in metrics:
        et = max(0.0, t - delay)
        if et <= 0:
            continue
        a = min(1.0, et / 0.35)
        fc = fade(color, a)
        draw.text((80,  my), label, font=fnt_lbl, fill=fc)

        bf = min(1.0, et * 2.5)
        n_fill  = int(filled * bf)
        n_empty = 10 - n_fill
        bar = "█" * n_fill + "░" * n_empty
        draw.text((520, my), bar, font=fnt_bar, fill=fade(DIM_G, a * 1.5))

        n_chars = int(et * 18)
        draw.text((860, my), value[:n_chars], font=fnt_val, fill=fc)
        draw.line([(80, my + 38), (1260, my + 38)], fill=(0, 22, 8), width=1)
        my += 68

    tx_lines = [
        ("LIQUIDITYALERT TRACKS REAL CAPITAL FLOWS", 3.8,  GREEN),
        ("ACROSS DEFI PROTOCOLS — IN REAL TIME.",    5.4,  CYAN),
        ("WHEN LIQUIDITY MOVES, BTC FOLLOWS.",       7.2,  GREEN),
        ("WE DETECT IT BEFORE PRICE REACTS.",        9.0,  CYAN),
    ]
    tsy = HEIGHT - 290
    draw.line([(80, tsy - 22), (WIDTH - 80, tsy - 22)], fill=(0, 40, 14), width=1)
    for i, (text, delay, color) in enumerate(tx_lines):
        et = max(0.0, t - delay)
        if et > 0:
            typewriter(draw, text, 80, tsy + i * 50, fnt_txt, color, et, cps=28)

    scanlines(draw, t, 0.015)
    return np.array(img)


# ── Scene 4 — The Signal  (35 – 48 s, local 0 – 13 s) ────────────────────────
def _btc_norm(x: float) -> float:
    """Stylized BTC cycle, returns price 0→1."""
    if x < 0.15:
        return 0.72 + 0.18 * math.sin(x * math.pi * 3)
    if x < 0.38:
        return 0.72 - (x - 0.15) / 0.23 * 0.52
    if x < 0.52:
        return 0.20 + (x - 0.38) / 0.14 * 0.12
    if x < 0.88:
        return 0.32 + (x - 0.52) / 0.36 * 0.64
    return 0.96 - (x - 0.88) / 0.12 * 0.12


SIG_X = 0.44   # signal_x fraction

def scene4(t: float) -> np.ndarray:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    fnt_hd  = font(26, bold=True)
    fnt_lbl = font(18, bold=True)
    fnt_txt = font(26, bold=True)

    draw.text((80, 40), "BTC_CYCLE_ANALYSIS // OCM_PATTERN_DETECTION",
              font=fnt_hd, fill=GREEN)
    draw.line([(80, 82), (WIDTH - 80, 82)], fill=(0, 50, 18), width=1)

    CX, CY, CW, CH = 80, 100, WIDTH - 160, 510

    draw.rectangle([(CX, CY), (CX + CW, CY + CH)], fill=(7, 12, 7))
    draw.rectangle([(CX, CY), (CX + CW, CY + CH)], outline=(0, 38, 14), width=1)

    for i in range(1, 5):
        gy = CY + i * CH // 5
        draw.line([(CX, gy), (CX + CW, gy)], fill=(0, 18, 7), width=1)
    for i in range(1, 8):
        gx = CX + i * CW // 8
        draw.line([(gx, CY), (gx, CY + CH)], fill=(0, 18, 7), width=1)

    reveal = min(1.0, t / 2.2)
    max_px  = CX + int(CW * reveal)
    sig_px  = CX + int(CW * SIG_X)

    # Bear zone fill
    bear_end = min(sig_px, max_px)
    if bear_end > CX and t > 0.3:
        za = min(1.0, (t - 0.3) / 0.6)
        zone = Image.new("RGB", (WIDTH, HEIGHT), BG)
        zd = ImageDraw.Draw(zone)
        # Build polygon following the price curve
        pts = []
        for x in range(CX, bear_end + 1):
            xf = (x - CX) / CW
            py_val = CY + CH - int(_btc_norm(xf) * CH)
            pts.append((x, py_val))
        pts += [(bear_end, CY + CH), (CX, CY + CH)]
        zd.polygon(pts, fill=(60, 0, 0))
        img = Image.blend(img, zone, za * 0.35)
        draw = ImageDraw.Draw(img)

    # Bull zone fill
    if reveal > SIG_X and t > 1.2:
        bull_start = sig_px
        bull_end   = max_px
        za = min(1.0, (t - 1.2) / 0.6)
        zone = Image.new("RGB", (WIDTH, HEIGHT), BG)
        zd = ImageDraw.Draw(zone)
        pts = []
        for x in range(bull_start, bull_end + 1):
            xf = (x - CX) / CW
            py_val = CY + CH - int(_btc_norm(xf) * CH)
            pts.append((x, py_val))
        pts += [(bull_end, CY + CH), (bull_start, CY + CH)]
        zd.polygon(pts, fill=(0, 50, 18))
        img = Image.blend(img, zone, za * 0.35)
        draw = ImageDraw.Draw(img)

    # Price line
    prev = None
    for x in range(CX, max_px):
        xf  = (x - CX) / CW
        py_ = CY + CH - int(_btc_norm(xf) * CH)
        if xf < SIG_X:
            lc = BEAR
        else:
            frac = min(1.0, (xf - SIG_X) / 0.18)
            lc = clamp_color(
                BEAR[0] * (1 - frac) + BULL[0] * frac,
                BEAR[1] * (1 - frac) + BULL[1] * frac,
                BEAR[2] * (1 - frac) + BULL[2] * frac,
            )
        pt = (x, py_)
        if prev:
            draw.line([prev, pt], fill=lc, width=2)
        prev = pt

    # Signal vertical line
    if t > 2.4:
        sa = min(1.0, (t - 2.4) / 0.5)
        sc = fade(GREEN, sa)
        draw.line([(sig_px, CY), (sig_px, CY + CH)], fill=sc, width=2)

        sig_fnt = font(17, bold=True)
        sig_lbl = "SIGNAL_DETECTED"
        sb = sig_fnt.getbbox(sig_lbl)
        slx = sig_px - sb[2] - 12
        sly = CY + 18
        draw.rectangle([(slx - 4, sly - 4), (sig_px - 6, sly + sb[3] + 6)],
                       fill=(0, 25, 8))
        draw.text((slx, sly), sig_lbl, font=sig_fnt, fill=sc)

    # Zone labels
    if reveal > 0.08:
        draw.text((CX + 18, CY + 16), "BEAR_PHASE", font=fnt_lbl, fill=BEAR)
    if reveal > 0.55:
        draw.text((sig_px + 18, CY + 16), "BULL_PHASE", font=fnt_lbl, fill=BULL)

    # Confirmation text
    conf_lines = [
        ("OCM BOTTOM SIGNAL — OCTOBER 2023  ✓", 3.6, GREEN),
        ("OCM BOTTOM SIGNAL — JANUARY 2025  ✓", 5.2, GREEN),
        ("PATTERN_ACCURACY: CONFIRMED",          6.8, CYAN),
    ]
    tsy = CY + CH + 28
    draw.line([(80, tsy - 8), (WIDTH - 80, tsy - 8)], fill=(0, 40, 14), width=1)
    for i, (text, delay, color) in enumerate(conf_lines):
        et = max(0.0, t - delay)
        if et > 0:
            typewriter(draw, text, 80, tsy + 14 + i * 50, fnt_txt, color, et, cps=26)

    scanlines(draw, t, 0.015)
    return np.array(img)


# ── Scene 5 — CTA  (48 – 60 s, local 0 – 12 s) ───────────────────────────────
def scene5(t: float) -> np.ndarray:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    fnt_lg = font(38, bold=True)
    fnt_md = font(30, bold=True)
    fnt_sm = font(26)

    lines = [
        ("> NO CHARTS.",           GREEN,  0.4,  fnt_lg),
        ("> NO NOISE.",            GREEN,  1.5,  fnt_lg),
        ("> JUST SIGNALS.",        GREEN,  2.7,  fnt_lg),
        ("",                       GREEN,  3.8,  fnt_lg),
        ("> JOIN TELEGRAM ELITE",  CYAN,   4.2,  fnt_lg),
        (">   liquidityalert.net", CYAN,   5.8,  fnt_sm),
        ("",                       GREEN,  7.0,  fnt_lg),
        ("> ALPHA_NODE_FOUNDRY V3.2 ●", GREEN, 7.3, fnt_md),
    ]

    total_h = len(lines) * 58
    sy = HEIGHT // 2 - total_h // 2

    for i, (text, color, delay, fnt) in enumerate(lines):
        if not text:
            continue
        et = max(0.0, t - delay)
        if et > 0:
            typewriter(draw, text, 200, sy + i * 58, fnt, color, et, cps=24)

    # Pulsing glow behind final ● once fully typed
    last_text = "> ALPHA_NODE_FOUNDRY V3.2 ●"
    last_et = max(0.0, t - 7.3)
    if last_et > len(last_text) / 24.0 + 0.5:
        pulse = 0.55 + 0.45 * math.sin(t * math.pi * 2.5)
        ly = sy + 7 * 58
        bb = fnt_md.getbbox(last_text[:-1])
        dx = 200 + bb[2] + 6
        gr = int(12 * pulse)
        draw.ellipse([(dx - gr, ly + 4 - gr),
                      (dx + gr + 14, ly + 4 + gr + 14)],
                     fill=(0, int(GREEN[1] * pulse * 0.4), 0))

    # Fade to black (t > 10)
    if t > 10.0:
        img = blend_img(img, BG, min(1.0, (t - 10.0) / 2.0))
        draw = ImageDraw.Draw(img)

    scanlines(draw, t, 0.018)
    return np.array(img)


# ── Dispatcher ────────────────────────────────────────────────────────────────
def make_frame(t: float) -> np.ndarray:
    if t < 5:
        return scene1(t)
    elif t < 18:
        return scene2(t - 5)
    elif t < 35:
        return scene3(t - 18)
    elif t < 48:
        return scene4(t - 35)
    else:
        return scene5(t - 48)


# ── Render ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Rendering LiquidityAlert explainer — 60 s @ 24 fps (1920×1080)…")
    clip = VideoClip(make_frame, duration=DURATION)
    clip.write_videofile(
        "liquidityalert_explainer.mp4",
        fps=FPS,
        codec="libx264",
        bitrate="8000k",
    )
    print("Done → liquidityalert_explainer.mp4")
