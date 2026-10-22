import os
from PIL import Image, ImageDraw

def create_squircle_mask(size, radius):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (size[0] - 1, size[1] - 1)], radius=radius, fill=255)
    return mask

def make_openlearn_icon(output_path):
    size = (512, 512)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    
    # 1. Background dark rounded rectangle
    bg = Image.new("RGBA", size, (9, 9, 11, 255)) # #09090b
    mask = create_squircle_mask(size, 115)
    bg.putalpha(mask)
    img.alpha_composite(bg)
    
    draw = ImageDraw.Draw(img)
    # Subtle inner teal-glow border
    draw.rounded_rectangle([(8, 8), (503, 503)], radius=110, outline=(94, 234, 212, 100), width=5)
    draw.rounded_rectangle([(14, 14), (497, 497)], radius=105, outline=(45, 212, 191, 50), width=2)
    
    # Scale from 48x48 coordinates in logo.svg to 512x512
    # Scale factor = 512 / 48 = 10.6667
    s = 512.0 / 48.0
    
    # Sparkle star at top right
    # SVG path: d="m34 5 1.4 4.6L40 11l-4.6 1.4L34 17l-1.4-4.6L28 11l4.6-1.4z" fill="#5eead4"
    star_pts = [
        (34 * s, 5 * s),
        (35.4 * s, 9.6 * s),
        (40 * s, 11 * s),
        (35.4 * s, 12.4 * s),
        (34 * s, 17 * s),
        (32.6 * s, 12.4 * s),
        (28 * s, 11 * s),
        (32.6 * s, 9.6 * s)
    ]
    draw.polygon(star_pts, fill=(94, 234, 212, 255)) # #5eead4
    
    # Inner glow of star
    star_inner = [
        (34 * s, 7 * s),
        (34.8 * s, 10 * s),
        (38 * s, 11 * s),
        (34.8 * s, 12 * s),
        (34 * s, 15 * s),
        (33.2 * s, 12 * s),
        (30 * s, 11 * s),
        (33.2 * s, 10 * s)
    ]
    draw.polygon(star_inner, fill=(255, 255, 255, 240))
    
    # Open Book
    # Left page outline: (10, 15) -> curves to (24, 17) -> down to (24, 38) -> curves to (10, 36) -> back to (10, 15)
    # Right page outline: (24, 17) -> curves to (38, 15) -> down to (38, 36) -> curves to (24, 38)
    # Book spine in center: x=24*s
    cx = 24.0 * s
    cy_top = 18.0 * s
    cy_bot = 39.0 * s
    
    # Spine line
    draw.line([(cx, cy_top), (cx, cy_bot)], fill=(255, 255, 255, 255), width=int(2.6 * s))
    
    # Let's draw the book pages with high smoothness
    # Left page curve top: (10, 15) to (24, 18)
    # Right page curve top: (24, 18) to (38, 15)
    # Left page curve bot: (10, 36) to (24, 39)
    # Right page curve bot: (24, 39) to (38, 36)
    
    import numpy as np
    
    # We can draw the book lines
    # Outer book curve
    book_pts_left_top = []
    for t in range(25):
        u = t / 24.0
        # x from 10 to 24
        px = (10 + (24 - 10) * u) * s
        # y curve: 15 - 2*sin(u*pi) or similar
        # SVG: "M10 15c5-2 10-1 14 2" -> bezier from (10,15) c1=(15,13) c2=(20,14) end=(24,17)
        py = ((1 - u)**3 * 15 + 3*(1 - u)**2 * u * 13 + 3*(1 - u) * u**2 * 14 + u**3 * 17) * s
        book_pts_left_top.append((px, py))
        
    book_pts_right_top = []
    for t in range(25):
        u = t / 24.0
        # x from 24 to 38
        px = (24 + (38 - 24) * u) * s
        # SVG: "c4-3 9-4 14-2" -> from (24,17) c1=(28,14) c2=(33,13) end=(38,15)
        py = ((1 - u)**3 * 17 + 3*(1 - u)**2 * u * 14 + 3*(1 - u) * u**2 * 13 + u**3 * 15) * s
        book_pts_right_top.append((px, py))
        
    book_pts_right_bot = []
    for t in range(25):
        u = t / 24.0
        px = (38 - (38 - 24) * u) * s
        # 21 units down from top
        py = (((1 - u)**3 * 15 + 3*(1 - u)**2 * u * 13 + 3*(1 - u) * u**2 * 14 + u**3 * 17) + 21) * s
        book_pts_right_bot.append((px, py))
        
    book_pts_left_bot = []
    for t in range(25):
        u = t / 24.0
        px = (24 - (24 - 10) * u) * s
        py = (((1 - u)**3 * 17 + 3*(1 - u)**2 * u * 14 + 3*(1 - u) * u**2 * 13 + u**3 * 15) + 21) * s
        book_pts_left_bot.append((px, py))
        
    # Draw outer book contour
    full_contour = book_pts_left_top + book_pts_right_top + [(38 * s, 36 * s)] + book_pts_right_bot + book_pts_left_bot + [(10 * s, 15 * s)]
    draw.line(full_contour, fill=(255, 255, 255, 255), width=int(2.6 * s), joint="round")
    
    # Left page vertical line
    draw.line([(10 * s, 15 * s), (10 * s, 36 * s)], fill=(255, 255, 255, 255), width=int(2.6 * s))
    # Right page vertical line
    draw.line([(38 * s, 15 * s), (38 * s, 36 * s)], fill=(255, 255, 255, 255), width=int(2.6 * s))
    
    # Page text lines (subtle text hints inside book)
    # Left page lines: (15, 22) -> (19, 23), (15, 28) -> (19, 29)
    draw.line([(15 * s, 22 * s), (19 * s, 23 * s)], fill=(255, 255, 255, 220), width=int(2.0 * s))
    draw.line([(15 * s, 28 * s), (19 * s, 29 * s)], fill=(255, 255, 255, 220), width=int(2.0 * s))
    
    # Right page lines: (29, 23) -> (33, 22), (29, 29) -> (33, 28)
    draw.line([(29 * s, 23 * s), (33 * s, 22 * s)], fill=(255, 255, 255, 220), width=int(2.0 * s))
    draw.line([(29 * s, 29 * s), (33 * s, 28 * s)], fill=(255, 255, 255, 220), width=int(2.0 * s))
    
    # Save multi-res ico
    icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    img.save(output_path, format="ICO", sizes=icon_sizes)
    print(f"Created OpenLearn icon at {output_path}")

if __name__ == "__main__":
    out_ico = "D:/Project/openquiz/public/openlearn.ico"
    make_openlearn_icon(out_ico)

