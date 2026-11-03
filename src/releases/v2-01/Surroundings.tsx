import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {UrbanBackdrop} from '../../shared/three/UrbanBackdrop';
import {seeded} from '../../assets/kit';
import type {Exclusion} from '../../shared/three/urban-fabric';
import {useRelease201} from './context';

const CORE: Exclusion = {minX: -300, maxX: 300, minZ: -460, maxZ: 240};
const FOLIAGE = new THREE.IcosahedronGeometry(1, 0);

const ParkHorizon: React.FC = () => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const matrices = useMemo(() => {
    const random = seeded(201), object = new THREE.Object3D();
    return Array.from({length: 120}, () => {
      const angle = random() * Math.PI * 2, distance = 150 + random() * 150;
      object.position.set(Math.cos(angle) * distance, 2 + random() * 2, Math.sin(angle) * distance - 40);
      object.scale.set(4 + random() * 6, 3 + random() * 5, 4 + random() * 6);
      object.rotation.set(0, random() * Math.PI, 0); object.updateMatrix();
      return object.matrix.clone();
    });
  }, []);
  useLayoutEffect(() => {
    matrices.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current!.instanceMatrix.needsUpdate = true; ref.current!.computeBoundingSphere();
  }, [matrices]);
  return <instancedMesh ref={ref} args={[FOLIAGE, undefined, matrices.length]}><meshStandardMaterial color="#647a52" roughness={1} flatShading /></instancedMesh>;
};

/** Extend around the set, with an untouched central area for all original actions. */
export const Surroundings201: React.FC<{
  exclude?: Exclusion; groundY?: number; vegetation?: number; ruin?: number; snow?: number;
  temperature?: number; opacity?: number; park?: boolean;
  drift?: [number, number, number];
}> = ({exclude = CORE, groundY = 0, vegetation = 0, ruin = 0, snow = 0, temperature = 0, opacity = 1, park = false, drift = [0, 0, 0]}) => {
  const enabled = useRelease201();
  if (!enabled || opacity < 0.01) return null;
  if (park) return <ParkHorizon />;
  const extent = 3500;
  const ground = new THREE.Color('#969181').lerp(new THREE.Color('#61784f'), vegetation * 0.8)
    .lerp(new THREE.Color('#dce5e8'), snow).lerp(new THREE.Color('#46382f'), Math.min(1, Math.max(0, temperature - 180) / 700));
  const strips = [
    {x: -extent / 2 + exclude.minX / 2, z: 0, w: extent + exclude.minX, d: extent * 2},
    {x: extent / 2 + exclude.maxX / 2, z: 0, w: extent - exclude.maxX, d: extent * 2},
    {x: (exclude.minX + exclude.maxX) / 2, z: -extent / 2 + exclude.minZ / 2, w: exclude.maxX - exclude.minX, d: extent + exclude.minZ},
    {x: (exclude.minX + exclude.maxX) / 2, z: extent / 2 + exclude.maxZ / 2, w: exclude.maxX - exclude.minX, d: extent - exclude.maxZ},
  ];
  return <group position={[0, groundY, 0]}>
    {strips.map((s, i) => <mesh key={i} position={[s.x, -0.08, s.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[s.w, s.d]} /><meshStandardMaterial color={ground} transparent={opacity < 1} opacity={opacity} roughness={1} />
    </mesh>)}
    <group position={drift}><UrbanBackdrop seed={201} radius={2800} parcels={2000} cz={-100} exclude={exclude} river={false}
      vegetation={vegetation} ruin={ruin} snow={snow} temperature={temperature} opacity={opacity} /></group>
  </group>;
};
