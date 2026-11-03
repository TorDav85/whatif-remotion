"""Assemble rendered stills (f-<frame>.png) into one labelled contact sheet, 5 per row."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

folder, out = Path(sys.argv[1]), Path(sys.argv[2])
fps = float(sys.argv[3]) if len(sys.argv) > 3 else 30.0
files = sorted(folder.glob('f-*.png'), key=lambda p: int(p.stem[2:]))
if not files:
    sys.exit('Aucune image f-*.png dans ' + str(folder))
w, h = 270, 480
cols = min(5, len(files))
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (w * cols, h * rows), 'black')
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 70, 22], fill=(0, 0, 0))
    d.text((5, 5), f'{int(f.stem[2:]) / fps:.1f}s', fill=(246, 224, 94))
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(out)
