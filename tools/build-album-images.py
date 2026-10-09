#!/usr/bin/env python3
"""Build mobile album thumbnails: python3 tools/build-album-images.py (Pillow)."""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parent.parent / 'images' / 'stories'
before = after = count = 0
for source in sorted(root.glob('*/original/*.jpg')):
    target = source.parent.parent / 'album' / source.with_suffix('.webp').name
    target.parent.mkdir(exist_ok=True)
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert('RGB')
        image.thumbnail((960, 960), Image.Resampling.LANCZOS)
        image.save(target, 'WEBP', quality=80, method=6)
    before += (source.parent.parent / 'card' / source.name).stat().st_size
    after += target.stat().st_size
    count += 1
print(f'{count} album images: {before:,} → {after:,} bytes ({100 * (1 - after / before):.1f}% smaller than card versions)')
