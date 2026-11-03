import React, {useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {rng} from '../../core/animation';

/** Caméra pilotée à chaque frame (pas de useFrame : le rendu doit être reproductible). */
export const CameraRig: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}> = ({position, target, fov = 60}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...position);
    camera.fov = fov;
    camera.near = 0.05;
    camera.far = 1500;
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

const radial = (draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  draw(g);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

/** Halo lumineux (faux « bloom » : sprite additif). */
export const useGlowTexture = () =>
  useMemo(
    () =>
      radial((g) => {
        const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        gr.addColorStop(0, 'rgba(255,255,255,1)');
        gr.addColorStop(0.12, 'rgba(255,244,220,0.85)');
        gr.addColorStop(0.45, 'rgba(255,170,90,0.28)');
        gr.addColorStop(1, 'rgba(255,120,40,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, 256, 256);
      }),
    [],
  );

/** Anneau qui repère le trou noir quand il est encore invisible. */
export const useRingTexture = () =>
  useMemo(
    () =>
      radial((g) => {
        g.strokeStyle = 'rgba(255,255,255,0.95)';
        g.lineWidth = 9;
        g.beginPath();
        g.arc(128, 128, 108, 0, Math.PI * 2);
        g.stroke();
      }),
    [],
  );

export const sampleColor = (
  keys: ReadonlyArray<{t: number}>,
  t: number,
  field: string,
): THREE.Color => {
  const k = keys as unknown as Array<Record<string, any>>;
  if (t <= k[0].t) return new THREE.Color(k[0][field]);
  for (let i = 0; i < k.length - 1; i++) {
    if (t <= k[i + 1].t) {
      const f = (t - k[i].t) / (k[i + 1].t - k[i].t);
      const e = f * f * (3 - 2 * f);
      return new THREE.Color(k[i][field]).lerp(new THREE.Color(k[i + 1][field]), e);
    }
  }
  return new THREE.Color(k[k.length - 1][field]);
};

export const Stars: React.FC = () => {
  const geo = useMemo(() => {
    const r = rng(77);
    const pts = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const u = r() * 2 - 1;
      const a = r() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pts.set([s * Math.cos(a) * 60, u * 60, s * Math.sin(a) * 60], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffffff" size={0.12} sizeAttenuation fog={false} />
    </points>
  );
};
