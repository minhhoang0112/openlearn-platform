import math
import os
from pathlib import Path
from PIL import Image, ImageDraw

def render_pure_ol(size=512):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    scale = size / 48.0
    
    # 1. Background squircle container (rx=13)
    radius = int(13 * scale)
    bg_mask = Image.new("L", (size, size), 0)
    d_mask = ImageDraw.Draw(bg_mask)
    d_mask.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=radius, fill=255)
    
    bg_img = Image.new("RGBA", (size, size), (9, 9, 11, 255))
    d_bg = ImageDraw.Draw(bg_img)
    # Subtle dark navy-zinc gradient
    for y in range(size):
        ratio = y / size
        r = int(20 * (1 - ratio) + 9 * ratio)
        g = int(23 * (1 - ratio) + 9 * ratio)
        b = int(36 * (1 - ratio) + 11 * ratio)
        d_bg.line([(0, y), (size, y)], fill=(r, g, b, 255))
        
    bg_img.putalpha(bg_mask)
    img.alpha_composite(bg_img)
    
    # 2. Subtle border outline
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(
        [(int(1 * scale), int(1 * scale)), (size - int(1 * scale) - 1, size - int(1 * scale) - 1)],
        radius=radius - int(1 * scale),
        outline=(255, 255, 255, 25),
        width=max(1, int(1 * scale))
    )
    
    # 3. Letter O: cx=17, cy=24, r=8, stroke=3.8
    cx = 17.0 * scale
    cy = 24.0 * scale
    r = 8.0 * scale
    stroke_w = int(3.8 * scale)
    
    num_steps = 72
    for i in range(num_steps):
        angle1 = math.radians(i * (360 / num_steps))
        angle2 = math.radians((i + 1) * (360 / num_steps))
        
        # Color gradient: #5eead4 -> #38bdf8 -> #6366f1
        progress = ((math.degrees(angle1) + 90) % 360) / 360.0
        if progress < 0.5:
            t = progress / 0.5
            cr = int(94 * (1 - t) + 56 * t)
            cg = int(234 * (1 - t) + 189 * t)
            cb = int(212 * (1 - t) + 248 * t)
        else:
            t = (progress - 0.5) / 0.5
            cr = int(56 * (1 - t) + 99 * t)
            cg = int(189 * (1 - t) + 102 * t)
            cb = int(248 * (1 - t) + 241 * t)
            
        x1 = cx + r * math.cos(angle1)
        y1 = cy + r * math.sin(angle1)
        x2 = cx + r * math.cos(angle2)
        y2 = cy + r * math.sin(angle2)
        draw.line([(x1, y1), (x2, y2)], fill=(cr, cg, cb, 255), width=stroke_w)
        
    # 4. Letter L: M 29.5 16 V 32 H 39
    lx1 = 29.5 * scale
    ly1 = 16.0 * scale
    ly2 = 32.0 * scale
    lx2 = 39.0 * scale
    
    draw.line([(lx1, ly1), (lx1, ly2)], fill=(255, 255, 255, 255), width=stroke_w)
    draw.line([(lx1, ly2), (lx2, ly2)], fill=(255, 255, 255, 255), width=stroke_w)
    
    cap_r = stroke_w / 2.0
    draw.ellipse([(lx1 - cap_r, ly1 - cap_r), (lx1 + cap_r, ly1 + cap_r)], fill=(255, 255, 255, 255))
    draw.ellipse([(lx2 - cap_r, ly2 - cap_r), (lx2 + cap_r, ly2 + cap_r)], fill=(255, 255, 255, 255))
    draw.ellipse([(lx1 - cap_r, ly2 - cap_r), (lx1 + cap_r, ly2 + cap_r)], fill=(255, 255, 255, 255))
    
    return img

def make_openlearn_icon(output_ico_path):
    img = render_pure_ol(512)
    # Save standard PNGs
    public_dir = Path(__file__).resolve().parents[1] / "public"
    img.save(public_dir / "logo.png")
    
    # Save ICO with all Windows icon formats
    icon_sizes = [(256, 256), (128, 128), (96, 96), (64, 64), (48, 48), (32, 32), (24, 24), (16, 16)]
    img.save(output_ico_path, format="ICO", sizes=icon_sizes)
    print(f"Generated new pure OL icon at {output_ico_path}")

if __name__ == "__main__":
    out_ico = Path(__file__).resolve().parents[1] / "public" / "openlearn.ico"
    make_openlearn_icon(out_ico)
