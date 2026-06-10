from PIL import Image, ImageDraw
import os

os.makedirs('icons', exist_ok=True)

for size in [16, 48, 128]:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = max(1, size // 16)
    
    # Compound's brand color (dark theme background is #111)
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=size // 4,
        fill='#111111'
    )
    
    # Add a letter 'C'
    font_size = size // 2
    # Simple C using text (if font supports it, else we just use default)
    # Pillow default font is small, so for larger sizes we can draw manually, but text is fine if we load a font or just draw shapes.
    # To keep it simple without loading external TTF:
    draw.text((size // 2, size // 2), 'C', fill='white', anchor='mm', font_size=font_size)
    img.save(f'icons/icon-{size}.png')
    print(f'Created icons/icon-{size}.png ({size}x{size})')
