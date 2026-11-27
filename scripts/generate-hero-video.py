"""
Generates a seamless looping 1280x720 30fps HD video of the 3D volumetric rose & peony
floral grove (MP4 + WebM) from public/images/hero-grove-base.jpg using depth-parallax
camera drift, subtle breeze warp, volumetric sunlit shafts, and drifting 3D-layered petals.
"""
import math
import os
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.getcwd()
SRC_IMG = os.path.join(ROOT, "public", "images", "hero-grove-base.jpg")
OUT_MP4 = os.path.join(ROOT, "public", "media", "floral-grove.mp4")
OUT_WEBM = os.path.join(ROOT, "public", "media", "floral-grove.webm")

W, H = 1280, 720
FPS = 30
DURATION = 8  # seconds (240 frames, exact seamless loop)
FRAMES = FPS * DURATION


def make_petal_sprite(size, color_rgba, blur_r=0.0):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = size * 0.14
    # Organic heart/teardrop rose petal shape
    cx, cy = size * 0.5, size * 0.5
    pts = []
    for k in range(28):
        a = (k / 28.0) * math.tau
        rx = (size * 0.42 - pad * 0.3) * (0.85 + 0.15 * math.cos(2 * a))
        ry = (size * 0.34 - pad * 0.3) * (1.0 + 0.14 * math.sin(a))
        px = cx + math.cos(a) * rx
        py = cy + math.sin(a) * ry
        pts.append((px, py))
    draw.polygon(pts, fill=color_rgba)
    if blur_r > 0:
        img = img.filter(ImageFilter.GaussianBlur(radius=blur_r))
    return img


def main():
    os.makedirs(os.path.dirname(OUT_MP4), exist_ok=True)
    # Load high-res base image and scale with generous margin for parallax drift
    base = Image.open(SRC_IMG).convert("RGB")
    pad_w, pad_h = int(W * 1.14), int(H * 1.14)
    base = base.resize((pad_w, pad_h), Image.Resampling.LANCZOS)
    base_np = np.asarray(base, dtype=np.float32)

    # Precompute radial depth map (center valley is far, floral borders are close foreground)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    nx = (xx / W) * 2.0 - 1.0  # -1..1
    ny = (yy / H) * 2.0 - 1.0  # -1..1
    dist_center = np.sqrt((nx * 0.92) ** 2 + ((ny + 0.15) * 1.1) ** 2)
    fg_weight = np.clip((dist_center - 0.25) / 0.95, 0.0, 1.0) ** 1.45

    # Precompute soft sunlit volumetric ray mask centered at upper sunlit valley
    angle = np.arctan2(ny + 1.08, nx - 0.08)
    dist_sun = np.sqrt((nx - 0.08) ** 2 + (ny + 1.02) ** 2)
    sun_falloff = np.exp(-dist_sun * 1.35)

    # Pre-generate drifting rose/peony petals & golden motes with deterministic periodic trajectories
    rng = np.random.default_rng(42)
    petals = []
    palette = [
        (252, 214, 222, 185),
        (255, 236, 232, 175),
        (246, 186, 200, 165),
        (255, 245, 235, 195),
    ]
    for i in range(22):
        depth = rng.uniform(0.35, 1.0)  # larger = closer foreground
        size = int(14 + depth * 28)
        blur = 0.6 + (depth ** 2) * 2.4
        col = palette[i % len(palette)]
        sprite = make_petal_sprite(size, col, blur_r=blur)
        petals.append({
            "sprite": sprite,
            "x0": rng.uniform(0, W),
            "y0": rng.uniform(0, H),
            "vx_cycles": int(rng.choice([1, 1, 2])),
            "vy_cycles": int(rng.choice([1, 1, 2])),
            "sway_amp": rng.uniform(18, 48) * depth,
            "phase": rng.uniform(0, math.tau),
            "rot0": rng.uniform(0, 360),
            "rot_cycles": int(rng.choice([-1, 1, 2])),
        })

    motes = []
    for _ in range(38):
        motes.append({
            "x0": rng.uniform(0, W),
            "y0": rng.uniform(0, H * 0.85),
            "r": rng.uniform(2.0, 5.5),
            "phase": rng.uniform(0, math.tau),
            "amp_x": rng.uniform(12, 34),
            "amp_y": rng.uniform(10, 26),
            "alpha": rng.uniform(55, 135),
        })

    # Pipe raw RGB frames directly into ffmpeg for fast H.264 MP4 encoding
    cmd_mp4 = [
        "ffmpeg", "-y",
        "-f", "rawvideo", "-vcodec", "rawvideo",
        "-s", f"{W}x{H}", "-pix_fmt", "rgb24", "-r", str(FPS),
        "-i", "-",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-an", OUT_MP4,
    ]
    proc = subprocess.Popen(cmd_mp4, stdin=subprocess.PIPE, stderr=subprocess.PIPE)

    margin_x = (pad_w - W) * 0.5
    margin_y = (pad_h - H) * 0.5

    for f in range(FRAMES):
        t = f / float(FRAMES)  # 0..1 exact periodic loop
        theta = t * math.tau

        # Smooth 3D volumetric breathing zoom + lateral parallax drift
        zoom = 1.0 + 0.022 * (1.0 - math.cos(theta))  # 1.0 -> 1.044 -> 1.0
        cam_dx = math.sin(theta) * 18.0
        cam_dy = math.sin(theta * 2.0) * 6.5

        # Foreground petals/leaves shift more than the sunlit center valley + soft breeze ripple
        breeze = np.sin(theta * 2.0 + xx * 0.008 + yy * 0.005) * 2.6 * fg_weight

        src_x = (xx - W * 0.5) / zoom + W * 0.5 + margin_x + cam_dx * (0.42 + 0.95 * fg_weight) + breeze
        src_y = (yy - H * 0.5) / zoom + H * 0.5 + margin_y + cam_dy * (0.45 + 0.85 * fg_weight) + breeze * 0.45

        # Bilinear sample from base_np
        x0 = np.clip(np.floor(src_x).astype(np.int32), 0, pad_w - 2)
        y0 = np.clip(np.floor(src_y).astype(np.int32), 0, pad_h - 2)
        fx = (src_x - x0)[..., None]
        fy = (src_y - y0)[..., None]

        top = base_np[y0, x0] * (1.0 - fx) + base_np[y0, x0 + 1] * fx
        bot = base_np[y0 + 1, x0] * (1.0 - fx) + base_np[y0 + 1, x0 + 1] * fx
        frame = top * (1.0 - fy) + bot * fy

        # Sunlit golden volumetric rays softly pulsing
        ray_wave = 0.5 + 0.5 * np.sin(angle * 7.0 + math.sin(theta) * 0.65)
        ray_intensity = sun_falloff * (0.06 + 0.075 * ray_wave) * (0.85 + 0.15 * math.sin(theta + 0.6))
        frame[..., 0] = np.clip(frame[..., 0] + ray_intensity * 255.0 * 1.0, 0, 255)
        frame[..., 1] = np.clip(frame[..., 1] + ray_intensity * 255.0 * 0.94, 0, 255)
        frame[..., 2] = np.clip(frame[..., 2] + ray_intensity * 255.0 * 0.82, 0, 255)

        img = Image.fromarray(frame.astype(np.uint8), mode="RGB").convert("RGBA")

        # Draw sunlit golden floating pollen motes
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)
        for m in motes:
            mx = (m["x0"] + math.sin(theta + m["phase"]) * m["amp_x"]) % W
            my = (m["y0"] + math.cos(theta + m["phase"] * 1.3) * m["amp_y"]) % H
            twinkle = 0.45 + 0.55 * (0.5 + 0.5 * math.sin(theta * 2.0 + m["phase"]))
            a = int(m["alpha"] * twinkle)
            r = m["r"]
            odraw.ellipse((mx - r, my - r, mx + r, my + r), fill=(255, 244, 214, a))
        overlay = overlay.filter(ImageFilter.GaussianBlur(radius=1.4))
        img = Image.alpha_composite(img, overlay)

        # Composite drifting 3D-layered rose & peony petals
        for p in petals:
            px = (p["x0"] + t * W * p["vx_cycles"] * 0.35 + math.sin(theta + p["phase"]) * p["sway_amp"]) % (W + 80) - 40
            py = (p["y0"] + t * H * p["vy_cycles"] * 0.45 + math.cos(theta + p["phase"]) * (p["sway_amp"] * 0.4)) % (H + 80) - 40
            rot = p["rot0"] + t * 360.0 * p["rot_cycles"] + math.sin(theta + p["phase"]) * 24.0
            sp = p["sprite"].rotate(rot, resample=Image.Resampling.BILINEAR, expand=True)
            img.alpha_composite(sp, (int(px - sp.width * 0.5), int(py - sp.height * 0.5)))

        proc.stdin.write(img.convert("RGB").tobytes())

    proc.stdin.close()
    _, err = proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg MP4 failed:\n{err.decode('utf-8', errors='ignore')}")

    # Also transcode lightweight VP9 WebM for broad modern codec support
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", OUT_MP4,
            "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0",
            "-deadline", "realtime", "-cpu-used", "6",
            "-an", OUT_WEBM,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"Generated seamless Hero 3D Grove videos:")
    print(f"  MP4:  {OUT_MP4} ({os.path.getsize(OUT_MP4) / 1024:.1f} KB)")
    print(f"  WebM: {OUT_WEBM} ({os.path.getsize(OUT_WEBM) / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
