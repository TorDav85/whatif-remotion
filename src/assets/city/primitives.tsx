import React from 'react';
import * as THREE from 'three';
import {CYL, Mat} from '../kit';

export type V3 = [number, number, number];
export type ColorProps = {color?: string};
export type LightProps = {lit?: number};

/** Structural tube between two points; coordinates in metres. */
export const Rod: React.FC<{a: V3; b: V3; radius?: number; color?: string}> = ({a, b, radius = 0.035, color = '#304a49'}) => {
  const start = new THREE.Vector3(...a);
  const delta = new THREE.Vector3(...b).sub(start);
  const length = delta.length();
  if (length === 0) return null;
  const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
  return <mesh geometry={CYL} position={start.addScaledVector(delta, 0.5)} quaternion={rotation} scale={[radius * 2, length, radius * 2]}><Mat color={color} metal /></mesh>;
};

/** Wheel in the YZ plane, axle along X, rotation around X. */
export const Wheel: React.FC<{radius?: number; spin?: number}> = ({radius = 0.32, spin = 0}) => (
  <group rotation={[spin, 0, 0]}>
    <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[radius, radius * 0.1, 6, 20]} /><Mat color="#263337" /></mesh>
    <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[radius * 0.84, 0.014, 4, 20]} /><Mat color="#bbc4bf" metal /></mesh>
    {Array.from({length: 8}, (_, i) => {
      const a = i * Math.PI / 4;
      return <Rod key={i} a={[0, 0, 0]} b={[0, Math.cos(a) * radius * 0.84, Math.sin(a) * radius * 0.84]} radius={0.007} color="#b9c4bd" />;
    })}
  </group>
);
