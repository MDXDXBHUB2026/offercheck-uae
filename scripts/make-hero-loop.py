"""Render the hero background loop: a wall of glass offer cards on a plane tilted away in
perspective, its rows sliding in alternate directions (a looping card slider). A soft light
sweep crosses the wall and lights each card's status chip and gauge red, amber or green. The
far side of the wall (left, behind the headline) fades into the dark. No words, no numbers, no
audio, no claims.

Usage: python scripts/make-hero-loop.py   (needs numpy, Pillow and ffmpeg on PATH)
Writes public/hero/loop.webm, public/hero/loop.mp4 and public/hero/poster.jpg.

Seamless: each row moves exactly one card-sequence period per loop and the sweep starts and
ends off the wall, so the last frame leads straight into the first. Rows move with sub-pixel
interpolation, so the slide is smooth rather than stepped. Frames stream to ffmpeg one by one.

Brighter version (owner request, 2026-11-10): an emerald and cyan wall, lit more strongly, in the
app's palette. Each pixel's relative luminance is capped at MAX_LUMINANCE (hue kept); compression
overshoots a little, so the decoded files are measured after encoding and the result is pinned as
VIDEO_MAX_LUMINANCE in src/app/routes.test.ts. Hero text no longer sits on the video itself: it
sits on the glass panels (.hero-glass), whose fill keeps every text pair at 4.5:1 even over a pure
white pixel, and routes.test.ts checks that worst case.
Measured 2026-11-10 (decoded at 2 fps): brightest pixel webm 0.410, mp4 0.458, poster 0.372
(was 0.111 / 0.088 under the old 0.12 cap). Sizes: webm 1.36 MB, mp4 1.10 MB, poster 122 KB.
"""

import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1600, 900
FPS = 24
SECONDS = 20
N = FPS * SECONDS
MAX_LUMINANCE = 0.30  # source cap; the decoded maximum is pinned in routes.test.ts
SS = 2  # supersampling for card drawing

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "hero"
rng = np.random.default_rng(23)

RED, AMBER, GREEN = (248, 113, 113), (251, 191, 36), (52, 211, 153)
TONES = [RED, GREEN, AMBER, GREEN, RED, AMBER, GREEN, AMBER]


# ---------- one card ----------------------------------------------------------------------------

def card(w: int, h: int, tone, gauge: bool, pad: int):
    """Return (rgba, glow_rgba) for one card as float arrays 0..1 at 1x, with padding for shadow."""
    s = SS
    cw, ch = (w + 2 * pad) * s, (h + 2 * pad) * s
    x0, y0, x1, y1 = pad * s, pad * s, (pad + w) * s, (pad + h) * s
    r = 20 * s

    # Soft drop shadow.
    shadow = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((x0 + 6 * s, y0 + 18 * s, x1 - 6 * s, y1 + 10 * s), r, fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18 * s))

    # Glass body: a vertical gradient inside the rounded shape.
    mask = Image.new("L", (cw, ch), 0)
    ImageDraw.Draw(mask).rounded_rectangle((x0, y0, x1, y1), r, fill=255)
    grad = np.zeros((ch, cw, 4), np.uint8)
    t = np.linspace(0, 1, ch)[:, None]
    top, bottom = np.array([38, 66, 82]), np.array([12, 28, 40])
    grad[..., :3] = (top + (bottom - top) * t[..., None]).astype(np.uint8)
    body = Image.fromarray(grad, "RGBA")
    body.putalpha(Image.fromarray((np.asarray(mask).astype(np.uint16) * 240 // 255).astype(np.uint8)))
    img = Image.alpha_composite(shadow, body)

    d = ImageDraw.Draw(img)
    d.rounded_rectangle((x0, y0, x1, y1), r, outline=(148, 163, 184, 60), width=s)
    # Top edge highlight that fades out at the corners.
    hl = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    ImageDraw.Draw(hl).rounded_rectangle((x0, y0, x1, y1), r, outline=(226, 232, 240, 150), width=s)
    fade = np.zeros((ch, cw), np.float32)
    fade[y0:y0 + 3 * s] = np.sin(np.linspace(0, np.pi, cw))[None, :] ** 2
    hl_a = np.asarray(hl).copy()
    hl_a[..., 3] = (hl_a[..., 3] * fade).astype(np.uint8)
    img = Image.alpha_composite(img, Image.fromarray(hl_a, "RGBA"))
    d = ImageDraw.Draw(img)

    # Avatar with a blue-indigo gradient, name and role bars.
    av = int(min(h * 0.2, 34)) * s
    ax, ay = x0 + 18 * s, y0 + 18 * s
    avatar = np.zeros((av, av, 4), np.uint8)
    g = np.linspace(0, 1, av)[None, :, None]
    avatar[..., :3] = (np.array([16, 185, 129]) * (1 - g) + np.array([6, 182, 212]) * g).astype(np.uint8)
    am = Image.new("L", (av, av), 0)
    ImageDraw.Draw(am).ellipse((0, 0, av - 1, av - 1), fill=200)
    avatar_img = Image.fromarray(avatar, "RGBA")
    avatar_img.putalpha(am)
    img.alpha_composite(avatar_img, (ax, ay))
    bx = ax + av + 12 * s
    d.rounded_rectangle((bx, ay + 4 * s, bx + int(w * 0.34) * s, ay + 12 * s), 4 * s, fill=(100, 116, 139, 255))
    d.rounded_rectangle((bx, ay + 18 * s, bx + int(w * 0.22) * s, ay + 24 * s), 3 * s, fill=(51, 65, 85, 255))

    # Skeleton lines.
    right = x1 - (int(h * 0.42) + 24) * s if gauge else x1 - 18 * s
    y = ay + av + 18 * s
    while y + 8 * s < y1 - 46 * s:
        lw = int((right - (x0 + 18 * s)) * rng.uniform(0.55, 1.0))
        d.rounded_rectangle((x0 + 18 * s, y, x0 + 18 * s + lw, y + 7 * s), 4 * s, fill=(51, 65, 85, 255))
        y += 17 * s

    # Status chip (bottom left), gauge arc (right) when the card is large enough.
    cx0, cy0 = x0 + 18 * s, y1 - 34 * s
    chip = (cx0, cy0, cx0 + 74 * s, cy0 + 20 * s)
    d.rounded_rectangle(chip, 10 * s, fill=tone + (40,), outline=tone + (90,), width=s)
    d.ellipse((cx0 + 8 * s, cy0 + 6 * s, cx0 + 16 * s, cy0 + 14 * s), fill=tone + (220,))
    d.rounded_rectangle((cx0 + 22 * s, cy0 + 7 * s, cx0 + 64 * s, cy0 + 13 * s), 3 * s, fill=tone + (120,))
    box = sweep = None
    if gauge:
        gr = int(h * 0.21) * s
        gx, gy = x1 - 22 * s - gr, y0 + int(h * 0.55) * s
        box = (gx - gr, gy - gr, gx + gr, gy + gr)
        d.arc(box, 180, 360, fill=(51, 65, 85, 255), width=7 * s)
        sweep = {RED: 160, AMBER: 95, GREEN: 30}[tone]
        d.arc(box, 180, 180 + sweep, fill=tone + (230,), width=7 * s)

    # Glow layer: the chip and gauge in full colour, blurred, lit by the sweep.
    glow = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    dg = ImageDraw.Draw(glow)
    dg.rounded_rectangle(chip, 10 * s, fill=tone + (255,))
    if gauge:
        dg.arc(box, 180, 180 + sweep, fill=tone + (255,), width=9 * s)
    dg.rounded_rectangle((x0, y0, x1, y1), r, outline=tone + (140,), width=2 * s)
    glow = glow.filter(ImageFilter.GaussianBlur(8 * s))

    size = (w + 2 * pad, h + 2 * pad)
    return (np.asarray(img.resize(size, Image.LANCZOS)).astype(np.float32) / 255,
            np.asarray(glow.resize(size, Image.LANCZOS)).astype(np.float32) / 255)


# ---------- the wall: rows of cards on a flat plane, then warped into perspective ----------------

PW, PH = 2300, 1500  # plane size before the perspective warp
CW, CH, GAP, PER_ROW = 300, 180, 34, 8
STEP = CW + GAP
PERIOD = STEP * PER_ROW
ROW_PITCH = CH + 70
ROWS = 6
PAD = 40

# Where the plane's corners land on screen (TL, TR, BR, BL). The left edge is short and far,
# the right edge long and near: the wall recedes to the left, behind the headline.
SCREEN_QUAD = [(120, -60), (1900, -300), (2050, 1200), (200, 760)]


def perspective_coeffs(screen, plane):
    """Coefficients for PIL's PERSPECTIVE transform: maps an output (screen) pixel to the plane."""
    rows = []
    for (x, y), (u, v) in zip(screen, plane):
        rows.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        rows.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    a = np.array(rows, np.float64)
    b = np.array([c for _, uv in zip(screen, plane) for c in uv], np.float64)
    return np.linalg.solve(a, b).tolist()


COEFFS = perspective_coeffs(SCREEN_QUAD, [(0, 0), (PW, 0), (PW, PH), (0, PH)])


def premultiplied(arr):
    return np.concatenate([arr[..., :3] * arr[..., 3:4], arr[..., 3:4]], -1)


def build_rows():
    rows = []
    for r in range(ROWS):
        sprites = [card(CW, CH, TONES[(i * 3 + r * 5) % len(TONES)], True, PAD) for i in range(PER_ROW)]
        sh, sw = sprites[0][0].shape[:2]
        length = PERIOD + PW + sw + 2
        strip = np.zeros((sh, length, 4), np.float32)
        glow = np.zeros((sh, length, 4), np.float32)
        for k in range(length // STEP + 1):
            x = k * STEP
            if x + sw > length:
                break
            for layer, target in ((premultiplied(sprites[k % PER_ROW][0]), strip),
                                  (premultiplied(sprites[k % PER_ROW][1]), glow)):
                seg = target[:, x:x + sw]
                seg *= 1 - layer[..., 3:4]
                seg += layer
        top = 40 + r * ROW_PITCH - PAD
        rows.append(dict(strip=strip, glow=glow, top=top, dir=1 if r % 2 else -1, phase=(r * 0.37) % 1.0))
    return rows


def crop(arr, x):
    """Sub-pixel crop PW wide starting at fractional x."""
    i = int(np.floor(x))
    f = np.float32(x - i)
    return arr[:, i:i + PW] * (1 - f) + arr[:, i + 1:i + 1 + PW] * f


PU = np.arange(PW, dtype=np.float32)[None, :] / PW
PV = np.arange(PH, dtype=np.float32)[:, None] / PH


def plane_sweep(t):
    """A diagonal band of light crossing the plane once per loop, starting and ending off it."""
    pos = -0.4 + 1.8 * t
    return np.exp(-((PU - pos - 0.3 * (PV - 0.5)) / 0.08) ** 2)


def plane_frame(rows, t):
    plane = np.zeros((PH, PW, 4), np.float32)
    band = plane_sweep(t)
    for row in rows:
        off = ((t + row["phase"]) % 1.0) * PERIOD
        if row["dir"] > 0:
            off = PERIOD - off
        s, g = crop(row["strip"], off), crop(row["glow"], off)
        y0, y1 = max(row["top"], 0), min(row["top"] + s.shape[0], PH)
        s, g = s[y0 - row["top"]:y1 - row["top"]], g[y0 - row["top"]:y1 - row["top"]]
        lit = band[y0:y1, :, None]
        region = plane[y0:y1]
        region *= 1 - s[..., 3:4]
        region += s
        # The sweep brightens the glass slightly and lights the status chips and gauges.
        region[..., :3] += s[..., 3:4] * lit * np.array([0.14, 0.30, 0.26], np.float32)
        region[..., :3] += g[..., :3] * (0.35 + 1.3 * lit)
    return plane


def warp(plane):
    img = Image.fromarray((np.clip(plane, 0, 1) * 255).round().astype(np.uint8), "RGBA")
    out = img.transform((W, H), Image.PERSPECTIVE, COEFFS, Image.BICUBIC)
    return np.asarray(out).astype(np.float32) / 255


# ---------- screen-space background, depth fade and light -------------------------------------

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
Xn, Yn = xx / W, yy / H


def base_background():
    top, bottom = np.array([3, 10, 20], np.float32), np.array([6, 18, 30], np.float32)
    bg = top + (bottom - top) * Yn[..., None]
    glow = np.exp(-(((Xn - 0.72) / 0.45) ** 2 + ((Yn - 0.45) / 0.55) ** 2))
    bg += glow[..., None] * np.array([8, 52, 56], np.float32)
    return bg


BASE = base_background()
# Far side (left) fades into the dark; the near side (right) stays clear.
DEPTH = np.clip(0.40 + 0.65 * Xn ** 1.2, 0, 1)[..., None]
VIGNETTE = (1 - 0.3 * np.clip(((Xn - 0.6) ** 2) / 0.4 + ((Yn - 0.5) ** 2) / 0.5, 0, 1))[..., None]
SW_, SH_ = 320, 180
sy, sx = np.mgrid[0:SH_, 0:SW_].astype(np.float32)
BLOBS = [((16, 185, 129), 0.70, 0.40, 0.08, 0.08, 1, 1, 0.0, 0.26),
         ((6, 182, 212), 0.88, 0.70, 0.06, 0.08, 1, 1, 2.4, 0.22)]


def aurora(t):
    small = np.zeros((SH_, SW_, 3), np.float32)
    for colour, cx, cy, rx, ry, kx, ky, ph, size in BLOBS:
        x = (cx + rx * np.sin(2 * np.pi * kx * t + ph)) * SW_
        y = (cy + ry * np.cos(2 * np.pi * ky * t + ph)) * SH_
        small += np.exp(-((sx - x) ** 2 + (sy - y) ** 2) / (2 * (size * SW_) ** 2))[..., None] * np.array(colour, np.float32) * 0.30
    return np.stack([np.asarray(Image.fromarray(np.ascontiguousarray(small[..., i]), "F").resize((W, H), Image.BILINEAR))
                     for i in range(3)], -1)


def cap_luminance(frame):
    c = np.clip(frame, 0, 255) / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    lum = lin @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    lin = np.minimum(lin * np.minimum(1.0, MAX_LUMINANCE / np.maximum(lum, 1e-6))[..., None], 1.0)
    return np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055) * 255


def frames():
    rows = build_rows()
    grain = rng.normal(0, 1.0, size=(H, W, 1)).astype(np.float32)  # static, costs little bitrate
    for k in range(N):
        t = k / N
        wall = warp(plane_frame(rows, t))
        a = wall[..., 3:4] * DEPTH
        frame = (BASE + aurora(t)) * (1 - a) + wall[..., :3] * 255 * DEPTH
        frame *= VIGNETTE
        yield np.clip(cap_luminance(frame + grain), 0, 255).round().astype(np.uint8)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    src = ["-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
    common = ["ffmpeg", "-y", "-loglevel", "error", *src, "-an"]
    encoders = [
        subprocess.Popen([*common, "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", "-pix_fmt", "yuv420p",
                          "-row-mt", "1", str(OUT / "loop.webm")], stdin=subprocess.PIPE),
    ]
    for k, frame in enumerate(frames()):
        data = frame.tobytes()
        for enc in encoders:
            enc.stdin.write(data)
        if k == int(N * 0.42):
            Image.fromarray(frame).save(OUT / "poster.jpg", quality=84, optimize=True, progressive=True)
    for enc in encoders:
        enc.stdin.close()
        if enc.wait() != 0:
            raise SystemExit("ffmpeg failed")
    # The MP4 fallback is made from the WebM (x264, for browsers without VP9).
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(OUT / "loop.webm"), "-an",
                    "-c:v", "libx264", "-preset", "slower",
                    "-crf", "34", "-tune", "animation", "-pix_fmt", "yuv420p", "-g", str(FPS * 4),
                    "-movflags", "+faststart", str(OUT / "loop.mp4")], check=True)
    for name in ("loop.webm", "loop.mp4", "poster.jpg"):
        print(name, (OUT / name).stat().st_size, "bytes")


if __name__ == "__main__":
    main()
