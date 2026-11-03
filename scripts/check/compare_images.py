"""Compare out/compare-stills/avant/<name> with apres/<name>: mean and max RGB difference (0–255)."""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

folder = Path(sys.argv[1])
changed = 0
for name in sys.argv[2:]:
    a = np.asarray(Image.open(folder / 'avant' / name).convert('RGB'), dtype=np.int16)
    b = np.asarray(Image.open(folder / 'apres' / name).convert('RGB'), dtype=np.int16)
    if a.shape != b.shape:
        print(f'x {name} : dimensions différentes')
        changed += 1
        continue
    d = np.abs(a - b)
    mean, peak = float(d.mean()), int(d.max())
    same = mean <= 2
    changed += 0 if same else 1
    print(f"{'=' if same else 'x'} {name:32s} écart moyen {mean:.3f}  max {peak}")
print(f'{changed} image(s) différente(s).' if changed else 'Images identiques.')
sys.exit(1 if changed else 0)
