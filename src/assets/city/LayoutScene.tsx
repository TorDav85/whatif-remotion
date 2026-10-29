import React, {useMemo} from 'react';
import * as THREE from 'three';
import {SkyDome} from '../../shared/three/SkyDome';
import {CityLayoutItems, type CityLayout} from './registry';

export const SKY = {
  jour: {top: '#5b8fd1', bottom: '#e9e1cf', sun: '#fff1d8', sunI: 1.55, hemi: 1.15, amb: 0.22, ground: '#8a8478'},
  nuit: {top: '#0b0f22', bottom: '#2a2440', sun: '#7a8cc8', sunI: 0.25, hemi: 0.45, amb: 0.12, ground: '#4a463f'},
};

/** Sky, lights, fog and base ground shared by the editor and the Remotion compositions. */
export const CityEnvironment: React.FC<{night?: boolean; fogFar?: number}> = ({night = false, fogFar = 900}) => {
  const s = night ? SKY.nuit : SKY.jour;
  const top = useMemo(() => new THREE.Color(s.top), [s.top]);
  const bottom = useMemo(() => new THREE.Color(s.bottom), [s.bottom]);
  return (
    <>
      <SkyDome top={top} bottom={bottom} />
      <fog attach="fog" args={[bottom, fogFar * 0.25, fogFar]} />
      <hemisphereLight color={top} groundColor="#8a7e6a" intensity={s.hemi} />
      <directionalLight color={s.sun} intensity={s.sunI} position={[60, 80, 40]} />
      <ambientLight intensity={s.amb} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color={s.ground} roughness={0.95} />
      </mesh>
    </>
  );
};

const BACKDROP = new Set(['eiffel', 'tower', 'water', 'barge', 'tour-boat', 'bridge']);

/** Centre and size of the playable district (landmarks, river and skyline excluded). */
export const layoutBounds = (layout: CityLayout) => {
  const core = layout.items.filter((i) => !BACKDROP.has(i.type));
  const xs = core.map((i) => i.x);
  const zs = core.map((i) => i.z);
  if (!xs.length) return {cx: 0, cz: 0, size: 60};
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  return {cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, size: Math.max(40, x1 - x0, z1 - z0)};
};

/** A saved layout, ready to drop in any Remotion composition (add your own CameraRig). */
export const LayoutScene: React.FC<{layout: CityLayout; lit?: number; children?: React.ReactNode}> = ({layout, lit, children}) => {
  const night = (lit ?? (layout.sky === 'nuit' ? 1 : 0)) > 0.5;
  return (
    <>
      <CityEnvironment night={night} />
      <CityLayoutItems layout={layout} lit={lit ?? (night ? 1 : 0)} />
      {children}
    </>
  );
};
