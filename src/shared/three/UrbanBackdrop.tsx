import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {BOX_UP, MANSARD} from '../../assets/kit';
import {planUrbanFabric, type FabricBuilding, type FabricOptions} from './urban-fabric';

const STONES = ['#c8bea9', '#d0c4ae', '#bcbaa7', '#d2c6b1', '#bfb5a4'];
const ROOFS = ['#6e7b80', '#727e83', '#7c8687', '#647378', '#788184'];
type Weather = {vegetation?: number; ruin?: number; snow?: number; temperature?: number; opacity?: number};
const FOLIAGE = new THREE.IcosahedronGeometry(1, 0);
const Layer: React.FC<{buildings: FabricBuilding[]; roof?: boolean} & Weather> = ({buildings, roof = false, vegetation = 0, ruin = 0, snow = 0, temperature = 0, opacity = 1}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const object = new THREE.Object3D();
    const color = new THREE.Color();
    const distantGround = new THREE.Color('#8d9692');
    const moss = new THREE.Color('#617653'), snowColor = new THREE.Color('#dce5e8'), charred = new THREE.Color('#44372f');
    buildings.forEach((b, i) => {
      const damagedHeight = b.height * (1 - ruin * 0.78);
      object.position.set(b.x, roof ? damagedHeight : 0, b.z);
      object.rotation.set(0, b.yaw, 0);
      object.scale.set(b.width * (roof ? 1.03 : 1), roof ? 3.6 * (1 - b.edge * 0.9) * (1 - ruin * 0.85) : damagedHeight, b.depth * (roof ? 1.04 : 1));
      object.updateMatrix();
      mesh.setMatrixAt(i, object.matrix);
      color.set((roof ? ROOFS : STONES)[b.tone]).lerp(distantGround, b.edge * 0.92)
        .lerp(moss, vegetation * 0.65)
        .lerp(snowColor, snow * (roof ? 0.92 : 0.4))
        .lerp(charred, Math.max(0, Math.min(1, (temperature - 180) / 650)));
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [buildings, roof, vegetation, ruin, snow, temperature]);
  if (!buildings.length) return null;
  return <instancedMesh ref={ref} args={[roof ? MANSARD : BOX_UP, undefined, buildings.length]}>
    <meshStandardMaterial roughness={0.95} flatShading transparent={opacity < 1} opacity={opacity}
      emissive="#ff4b16" emissiveIntensity={Math.max(0, (temperature - 650) / 1000)} />
  </instancedMesh>;
};

/** Continuous background neighbourhoods, with no movable editor objects or repeated ground tiles. */
const Forest: React.FC<{buildings: FabricBuilding[]; amount: number}> = ({buildings, amount}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const trees = useMemo(() => buildings.filter((_, i) => i % 16 === 0), [buildings]);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const object = new THREE.Object3D();
    trees.forEach((b, i) => {
      const height = (5 + i % 7) * amount;
      object.position.set(b.x + b.width * 0.4, height * 0.8, b.z + b.depth * 0.6);
      object.rotation.set(0, i * 2.4, 0); object.scale.set(height * 0.65, height, height * 0.65); object.updateMatrix();
      ref.current!.setMatrixAt(i, object.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere();
  }, [trees, amount]);
  if (!trees.length) return null;
  return <instancedMesh ref={ref} args={[FOLIAGE, undefined, trees.length]}><meshStandardMaterial color="#52724b" roughness={1} flatShading /></instancedMesh>;
};

export const UrbanBackdrop: React.FC<FabricOptions & Weather> = ({seed, radius, parcels, cx, cz, exclude, river, ...weather}) => {
  const buildings = useMemo(() => planUrbanFabric({seed, radius, parcels, cx, cz, exclude, river}),
    [seed, radius, parcels, cx, cz, exclude?.minX, exclude?.maxX, exclude?.minZ, exclude?.maxZ, river]);
  return <group><Layer buildings={buildings} {...weather} /><Layer buildings={buildings} roof {...weather} />
    {(weather.vegetation ?? 0) > 0.01 && <Forest buildings={buildings} amount={weather.vegetation!} />}
  </group>;
};
