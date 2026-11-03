import React from 'react';
import * as THREE from 'three';
import {Surroundings201} from '../../releases/v2-01/Surroundings';
import {useGlowTexture} from '../../shared/three/common';
import {SkyDome} from '../../shared/three/SkyDome';
import {smooth} from '../../core/animation';
import {C, Bld, makeWindows as makeWindowsShared, useDisc} from '../../shared/three/instanced';
import {gradeColor, gradeNum, timeAtTemp} from './curve';

/** Le kit générique vit dans src/shared/three/instanced ; ici ne restent que les éléments liés à la courbe de Chaleur. */
export * from '../../shared/three/instanced';

/** Fenêtres de Chaleur : l'instant d'éclatement suit la courbe de température. */
export const makeWindows = (list: Bld[], seed: number, floorH = 2.6) => makeWindowsShared(list, seed, floorH, timeAtTemp);

export const HeatEnv: React.FC<{c: number; sunDir?: [number, number, number]; fogScale?: number; sunScale?: number; noSun?: boolean}> = ({
  c,
  sunDir = [0.35, 0.32, -1],
  fogScale = 1,
  sunScale = 1,
  noSun,
}) => {
  const glow = useGlowTexture();
  const disc = useDisc();
  const top = gradeColor(c, 'skyTop');
  const bottom = gradeColor(c, 'skyBottom');
  const fog = gradeColor(c, 'fog');
  const light = gradeColor(c, 'light');
  const sun = gradeColor(c, 'sun');
  const far = gradeNum(c, 'fogFar') * fogScale;
  const size = gradeNum(c, 'sunSize') * 2 * sunScale;
  const dir = new THREE.Vector3(...sunDir).normalize();
  const sp = dir.clone().multiplyScalar(420);
  return (
    <>
      <SkyDome top={top} bottom={bottom} />
      <Surroundings201 temperature={c} ruin={smooth(850, 1100, c)} exclude={{minX: -500, maxX: 500, minZ: -500, maxZ: 500}} />
      <fog attach="fog" args={[fog, far * 0.12, far]} />
      <hemisphereLight color={top.clone().lerp(C('#ffffff'), 0.35)} groundColor={C('#8a7060').lerp(C('#ff3a10'), smooth(500, 1100, c))} intensity={1.55} />
      <directionalLight color={light} intensity={1.7 - smooth(300, 800, c) * 0.6} position={[sp.x, Math.max(sp.y, 60), sp.z]} />
      <ambientLight color={C('#ff4a1a')} intensity={smooth(400, 1100, c) * 0.6} />
      {!noSun && (
        <group position={sp}>
          <sprite scale={[size, size, 1]}>
            <spriteMaterial map={disc} color={sun} fog={false} depthWrite={false} transparent />
          </sprite>
          <sprite scale={[size * 3.2, size * 3.2, 1]}>
            <spriteMaterial map={glow} color={sun} opacity={0.6} fog={false} depthWrite={false} transparent blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      )}
    </>
  );
};

