import React from 'react';
import * as THREE from 'three';
import {Ball, Block, Mat} from '../../assets/kit';

/** Shared bevelled geometry: soft silhouette, still deliberately low-poly. */
export const CHARACTER_BOX = (() => {
  const geo = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  const p = geo.getAttribute('position');
  const v = new THREE.Vector3(), core = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    core.copy(v).clampScalar(-0.36, 0.36);
    v.sub(core).normalize().multiplyScalar(0.14).add(core);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
})();

export const CharacterBlock: React.FC<React.ComponentProps<typeof Block>> = ({p, s, c, r, e, ei, o, metal}) => (
  <mesh geometry={CHARACTER_BOX} position={p} scale={s} rotation={r}>
    <Mat color={c} emissive={e} emissiveIntensity={ei} opacity={o} metal={metal} />
  </mesh>
);

export type HairStyle = 'court' | 'long' | 'chauve' | 'chignon';
export const CharacterHead: React.FC<{
  skin: string; hair: string; hairStyle?: HairStyle; smile?: number; worried?: number;
  glow?: number; blink?: number; elderly?: boolean;
}> = ({skin, hair, hairStyle = 'court', smile = 0, worried = 0, glow = 0, blink = 0, elderly = false}) => {
  const shade = new THREE.Color(skin).multiplyScalar(0.86).getStyle();
  const grin = Math.max(0, Math.min(1, smile));
  const eyeH = Math.max(0.003, 0.023 * (1 - Math.min(1, blink)));
  return <group>
    <CharacterBlock p={[0, 0, 0]} s={[0.3, 0.34, 0.29]} c={skin} e="#6aa8de" ei={glow * 0.3} />
    <CharacterBlock p={[0, -0.1, -0.005]} s={[0.245, 0.115, 0.26]} c={skin} />
    <Ball p={[0, -0.015, -0.157]} rad={0.041} s={[0.72, 0.96, 1]} c={skin} detail={1} />
    {[-1, 1].map((side) => <group key={side}>
      <Ball p={[side * 0.153, -0.007, 0]} rad={0.038} s={[0.6, 1, 0.65]} c={shade} />
      <Ball p={[side * 0.067, 0.043, -0.145]} rad={1} s={[0.033, eyeH, 0.012]} c="#f7eee1" detail={1} />
      <Ball p={[side * 0.067, 0.043, -0.157]} rad={1} s={[0.012, eyeH * 0.8, 0.006]} c="#303430" detail={1} />
      {blink < 0.7 && <Ball p={[side * 0.067 - 0.003, 0.049, -0.162]} rad={0.0045} c="#ffffff" detail={0} />}
      <CharacterBlock p={[side * 0.067, 0.09 + worried * 0.008, -0.146]} s={[0.058, 0.014, 0.014]} r={[0, 0, side * (worried * 0.4 - grin * 0.12)]} c={hair} />
      {elderly && <CharacterBlock p={[side * 0.107, 0.015, -0.14]} s={[0.026, 0.006, 0.012]} r={[0, 0, side * 0.3]} c={shade} />}
    </group>)}
    {smile > 1.2 ? <CharacterBlock p={[0, -0.075, -0.143]} s={[0.06, 0.036, 0.014]} c="#6d3c35" /> : grin > 0.2 ?
      <mesh position={[0, -0.059, -0.147]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.03, 0.005, 5, 12, Math.PI]} /><Mat color="#925b4d" /></mesh> :
      <CharacterBlock p={[0, -0.077, -0.144]} s={[0.047, 0.009, 0.012]} c="#925b4d" />}
    {hairStyle !== 'chauve' && <>
      <CharacterBlock p={[0, 0.177, 0.018]} s={[0.315, 0.105, 0.3]} c={hair} />
      <CharacterBlock p={[-0.06, 0.145, -0.115]} s={[0.18, 0.08, 0.07]} r={[0, 0, -0.12]} c={hair} />
      <CharacterBlock p={[0, 0.055, 0.125]} s={[0.29, 0.2, 0.07]} c={hair} />
    </>}
    {hairStyle === 'long' && <>
      <CharacterBlock p={[0, -0.09, 0.12]} s={[0.31, 0.4, 0.09]} c={hair} />
      {[-1, 1].map((side) => <CharacterBlock key={side} p={[side * 0.142, -0.03, 0.045]} s={[0.052, 0.29, 0.16]} c={hair} />)}
    </>}
    {hairStyle === 'chignon' && <Ball p={[0, 0.17, 0.19]} rad={0.095} c={hair} detail={1} />}
  </group>;
};

/** Merged silhouettes preserve instancing for the large legacy crowds. Origin at soles. */
const merge = (parts: {p: [number, number, number]; s: [number, number, number]; color?: string}[]) => {
  const positions: number[] = [], normals: number[] = [], colors: number[] = [];
  for (const part of parts) {
    const geo = CHARACTER_BOX.clone().scale(...part.s).translate(...part.p).toNonIndexed();
    positions.push(...Array.from(geo.getAttribute('position').array));
    normals.push(...Array.from(geo.getAttribute('normal').array));
    const color = new THREE.Color(part.color ?? '#ffffff');
    for (let i = 0; i < geo.getAttribute('position').count; i++) colors.push(color.r, color.g, color.b);
    geo.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return out;
};
export const CROWD_BODY = merge([
  {p: [0, 0.72, 0], s: [0.72, 0.56, 0.86]},
  ...[-1, 1].flatMap((side) => [
    {p: [side * 0.23, 0.23, 0], s: [0.29, 0.46, 0.7] as [number, number, number], color: '#586575'},
    {p: [side * 0.47, 0.62, 0], s: [0.19, 0.48, 0.6] as [number, number, number]},
  ] as {p: [number, number, number]; s: [number, number, number]; color?: string}[]),
]);
export const CROWD_HEAD = merge([
  {p: [0, 0.5, 0], s: [1, 1, 0.93]},
  {p: [0, 0.42, -0.5], s: [0.16, 0.18, 0.18]},
  {p: [0, 0.98, 0.025], s: [1.04, 0.2, 0.99], color: '#302b26'},
  ...[-1, 1].map((side) => ({p: [side * 0.21, 0.59, -0.47] as [number, number, number], s: [0.11, 0.14, 0.06] as [number, number, number], color: '#222725'})),
  ...[-1, 1].map((side) => ({p: [side * 0.51, 0.45, 0] as [number, number, number], s: [0.15, 0.25, 0.2] as [number, number, number]})),
]);
