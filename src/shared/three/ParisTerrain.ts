import {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../../core/animation';
import {planUrbanFabric, riverZ} from './urban-fabric';

const texture = (size: number, paint: (g: CanvasRenderingContext2D, s: number) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d')!;
  paint(context, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
};

/** Soft terrain variation and actual irregular roof footprints; never a grid of coloured tiles. */
export const useParisTerrain = () => useMemo(() => {
  const random = rng(904);
  const mottled = (g: CanvasRenderingContext2D, size: number, base: string, count: number) => {
    g.fillStyle = base;
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < count; i++) {
      const x = random() * size, y = random() * size, radius = size * (0.006 + random() * 0.055);
      const gradient = g.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, i % 3 ? 'rgba(72,97,65,0.10)' : 'rgba(217,201,153,0.13)');
      gradient.addColorStop(1, 'rgba(100,115,80,0)');
      g.fillStyle = gradient;
      g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  };
  const detail = texture(2048, (g, size) => {
    const px = (x: number) => (x / 6000 + 0.5) * size;
    const pz = (z: number) => ((z + 400) / 6000 + 0.5) * size;
    mottled(g, size, '#a29e8d', 1200);
    // Several gently curving avenues connect districts, at different angles and widths.
    g.strokeStyle = '#929184';
    for (let i = 0; i < 24; i++) {
      const angle = i * 2.39996;
      const dx = Math.cos(angle) * size, dy = Math.sin(angle) * size;
      const ox = size * (0.25 + random() * 0.5), oy = size * (0.25 + random() * 0.5);
      g.lineWidth = 2 + random() * 4;
      g.beginPath();
      g.moveTo(ox - dx, oy - dy);
      g.bezierCurveTo(ox - dx * 0.3 - dy * 0.12, oy - dy * 0.3 + dx * 0.12,
        ox + dx * 0.3, oy + dy * 0.3, ox + dx, oy + dy);
      g.stroke();
    }
    for (const b of planUrbanFabric({seed: 42, radius: 4200, parcels: 7000, cx: 0, cz: -400})) {
      g.save();
      g.translate(px(b.x), pz(b.z));
      g.rotate(-b.yaw);
      g.fillStyle = ['#7f8885', '#87908b', '#93988e', '#858c87', '#8d938c'][b.tone];
      g.fillRect(-b.width / 12000 * size, -b.depth / 12000 * size, b.width / 6000 * size, b.depth / 6000 * size);
      g.restore();
    }
    // The river has banks and a sinuous silhouette, with no rectangular water patch.
    for (const [width, color] of [[112, '#afb09a'], [80, '#64828b']] as const) {
      g.strokeStyle = color; g.lineWidth = width / 6000 * size;
      g.beginPath();
      for (let x = -3200; x <= 3200; x += 20) {
        if (x === -3200) g.moveTo(px(x), pz(riverZ(x))); else g.lineTo(px(x), pz(riverZ(x)));
      }
      g.stroke();
    }
    g.fillStyle = '#7d946c';
    g.beginPath(); g.ellipse(px(0), pz(-820), size * 0.018, size * 0.044, 0, 0, Math.PI * 2); g.fill();
    // The overlay merges into the regional ground without a visible square boundary.
    const edge = g.createRadialGradient(size / 2, size / 2, size * 0.35, size / 2, size / 2, size * 0.5);
    edge.addColorStop(0, '#ffffff'); edge.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = edge; g.fillRect(0, 0, size, size);
  });
  const land = texture(2048, (g, size) => {
    mottled(g, size, '#9aa183', 2400);
    const c = size / 2;
    const city = g.createRadialGradient(c, c, 0, c, c, size * 0.05);
    city.addColorStop(0, '#8d9692'); city.addColorStop(0.45, '#939c92'); city.addColorStop(1, 'rgba(157,159,140,0)');
    g.fillStyle = city; g.fillRect(0, 0, size, size);
    // Sub-pixel urban grain continues past the detailed buildings instead of ending in a disc.
    for (let i = 0; i < 35000; i++) {
      const angle = random() * Math.PI * 2, distance = Math.sqrt(random()) * size * 0.042;
      const x = c + Math.cos(angle) * distance, y = c + Math.sin(angle) * distance;
      g.globalAlpha = (1 - distance / (size * 0.042)) * 0.22;
      g.fillStyle = i % 2 ? '#697e80' : '#c6c2ad';
      g.beginPath(); g.ellipse(x, y, 0.5 + random(), 0.4 + random(), random() * Math.PI, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    g.strokeStyle = '#758e94'; g.lineWidth = 1.4;
    g.beginPath();
    for (let x = -300000; x <= 300000; x += 1000) {
      const z = -790 + 9000 * Math.sin(x / 55000);
      const px = (x / 600000 + 0.5) * size, py = ((z + 400) / 600000 + 0.5) * size;
      if (x === -300000) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.stroke();
  });
  return {detail, land};
}, []);
