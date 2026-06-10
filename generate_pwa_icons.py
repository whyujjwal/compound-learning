from PIL import Image, ImageDraw
import os

os.makedirs('frontend/public/icons', exist_ok=True)

for size in [192, 512]:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = size // 16
    
    # Compound's brand color
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=size // 4,
        fill='#111111'
    )
    
    font_size = size // 2
    draw.text((size // 2, size // 2), 'C', fill='white', anchor='mm', font_size=font_size)
    img.save(f'frontend/public/icons/icon-{size}x{size}.png')
    print(f'Created icon-{size}x{size}.png')
