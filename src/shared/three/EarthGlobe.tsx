import React, {useMemo} from 'react';
import * as THREE from 'three';

const hash = (i: number, j: number) => {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const vnoise = (x: number, y: number) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0) + (hash(x0 + 1, y0) - hash(x0, y0)) * sx;
  const b = hash(x0, y0 + 1) + (hash(x0 + 1, y0 + 1) - hash(x0, y0 + 1)) * sx;
  return a + (b - a) * sy;
};
const fbm = (x: number, y: number, o = 0) =>
  0.5 * vnoise(x * 4 + o, y * 2 + o) +
  0.25 * vnoise(x * 8 + o, y * 4 + o) +
  0.15 * vnoise(x * 16 + o, y * 8 + o) +
  0.1 * vnoise(x * 32 + o, y * 16 + o);

// New York (approx.) : on force un continent à cet endroit de la carte fictive.
const HU = (-74 + 180) / 360;
const HV = (90 - 40.7) / 180;

/** Point de la carte (u, v) → vecteur unitaire. Par défaut New York ; on peut passer un autre lieu. */
export const lonLatUV = (lon: number, lat: number) => ({hu: (lon + 180) / 360, hv: (90 - lat) / 180});

export const hotspotVector = (hu = HU, hv = HV) => {
  const theta = hv * Math.PI;
  const phi = hu * Math.PI * 2;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
};

export const useEarthTextures = (hu = HU, hv = HV) =>
  useMemo(() => {
    const W = 512;
    const H = 256;
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      return c;
    };
    const cMap = mk();
    const cCloud = mk();
    const gm = cMap.getContext('2d')!;
    const gc = cCloud.getContext('2d')!;
    const im = gm.createImageData(W, H);
    const ic = gc.createImageData(W, H);
    const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const ocean = hex('#4a86c8');
    const deep = hex('#3a6fb0');
    const green = hex('#7fb069');
    const green2 = hex('#5e9a4f');
    const tan = hex('#c9b27a');
    const ice = hex('#f1f5f9');
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const u = x / W;
        const v = y / H;
        // bruit raccordé en u = 0 / 1 (sinon couture verticale sur le globe)
        let n = fbm(u, v) * (1 - u) + fbm(u - 1, v) * u;
        n += 0.35 * Math.exp(-((u - hu) ** 2 * 60 + (v - hv) ** 2 * 200));
        let col: number[];
        const cap = 0.05 + 0.05 * (fbm(u, 0.5, 11) * (1 - u) + fbm(u - 1, 0.5, 11) * u);
        if (v < cap || v > 1 - cap) col = ice;
        else if (n > 0.6) col = n > 0.78 ? tan : n > 0.68 ? green2 : green;
        else col = n > 0.5 ? ocean : deep;
        const i = (y * W + x) * 4;
        im.data.set([col[0], col[1], col[2], 255], i);
        const cl = fbm(u, v, 37) * (1 - u) + fbm(u - 1, v, 37) * u;
        const a = Math.max(0, Math.min(1, (cl - 0.58) * 6));
        ic.data.set([255, 255, 255, Math.round(a * 215)], i);
      }
    }
    gm.putImageData(im, 0, 0);
    gc.putImageData(ic, 0, 0);
    const map = new THREE.CanvasTexture(cMap);
    const clouds = new THREE.CanvasTexture(cCloud);
    map.colorSpace = clouds.colorSpace = THREE.SRGBColorSpace;
    return {map, clouds};
  }, [hu, hv]);

export const EarthGlobe: React.FC<{fire?: number; spin?: number; hu?: number; hv?: number}> = ({fire = 0, spin = 0, hu = HU, hv = HV}) => {
  const {map, clouds} = useEarthTextures(hu, hv);
  const hp = useMemo(() => hotspotVector(hu, hv), [hu, hv]);
  const yaw = Math.atan2(-hp.x, hp.z);
  return (
    <group rotation={[0.55, 0, 0]}>
      <group rotation={[0, yaw + spin, 0]}>
        <mesh>
          <sphereGeometry args={[1, 64, 48]} />
          <meshStandardMaterial map={map} emissive={new THREE.Color('#ff3300').multiplyScalar(fire * 0.45)} />
        </mesh>
        <mesh rotation={[0, spin * 0.4, 0]}>
          <sphereGeometry args={[1.02, 48, 32]} />
          <meshStandardMaterial map={clouds} transparent depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
};
