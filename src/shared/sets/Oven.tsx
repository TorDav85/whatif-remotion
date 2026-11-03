import React from 'react';
import * as THREE from 'three';
import {clamp01} from '../../core/animation';
import {Block, Cyl, seeded} from '../../assets/kit';

/** Four géant (émail, porte vitrée, résistances) : extrait de marc-four en 1.12, réutilisé par marc-salaire-3. Mètres, porte en z = FRONT. */
type V3 = [number, number, number];
// ---------- Oven geometry (metres). Front (door) at z = 0.5, facing -z ----------
export const OW = 1.7; // outer width
export const OH = 2.6; // outer height
export const FRONT = 0.5;
export const BACK = 2.0;
export const FLOOR = 0.12;
export const IN_BACK: V3 = [0, FLOOR, 1.25];
export const IN_GLASS: V3 = [0, FLOOR, 0.95];
export const OUTSIDE: V3 = [0, 0, -0.5];
export const DIAL: V3 = [0.45, 2.78, FRONT - 0.04];

export const STEEL = '#b9c0c8';
export const ENAMEL = '#2b2522';

export const Oven: React.FC<{t: number; heat: number; door: number}> = ({t, heat, door}) => {
  const glow = 0.4 + 2.6 * heat + 0.15 * Math.sin(t * 9);
  const element = new THREE.Color('#5a2a1a').lerp(new THREE.Color('#ff5a1a'), clamp01(heat * 1.6)).lerp(new THREE.Color('#fff2c0'), clamp01(heat * 2 - 1)).getStyle();
  const cz = (FRONT + BACK) / 2;
  const depth = BACK - FRONT;
  const lightCol = new THREE.Color('#ffb070').lerp(new THREE.Color('#fff0d0'), heat);
  return (
    <group>
      {/* Shell */}
      <Block p={[-OW / 2 + 0.06, OH / 2, cz]} s={[0.12, OH, depth]} c={STEEL} metal />
      <Block p={[OW / 2 - 0.06, OH / 2, cz]} s={[0.12, OH, depth]} c={STEEL} metal />
      <Block p={[0, OH - 0.06, cz]} s={[OW, 0.12, depth]} c={STEEL} metal />
      <Block p={[0, FLOOR / 2, cz]} s={[OW, FLOOR, depth]} c={STEEL} metal />
      <Block p={[0, OH / 2, BACK - 0.06]} s={[OW, OH, 0.12]} c={STEEL} metal />
      {/* Enamel inside */}
      <Block p={[-OW / 2 + 0.125, OH / 2, cz]} s={[0.01, OH - 0.24, depth - 0.1]} c={ENAMEL} />
      <Block p={[OW / 2 - 0.125, OH / 2, cz]} s={[0.01, OH - 0.24, depth - 0.1]} c={ENAMEL} />
      <Block p={[0, OH / 2, BACK - 0.125]} s={[OW - 0.24, OH - 0.24, 0.01]} c={ENAMEL} />
      <Block p={[0, OH - 0.125, cz]} s={[OW - 0.24, 0.01, depth - 0.1]} c={ENAMEL} />
      <Block p={[0, FLOOR + 0.005, cz]} s={[OW - 0.24, 0.01, depth - 0.1]} c="#3a332e" />
      {/* Racks on the side walls */}
      {[0.8, 1.4, 2.0].flatMap((y) => [-1, 1].map((s) => <Block key={`${y}${s}`} p={[s * (OW / 2 - 0.15), y, cz]} s={[0.03, 0.03, depth - 0.2]} c="#8a8f96" metal />))}
      {/* Heating elements, top and bottom */}
      {[OH - 0.2, FLOOR + 0.06].flatMap((y) => [-0.35, 0, 0.35].map((dz) => (
        <Cyl key={`${y}${dz}`} p={[0, y, cz + dz]} rad={0.018} h={OW - 0.3} r={[0, 0, Math.PI / 2]} c={element} e={element} ei={0.3 + 2.5 * heat} />
      )))}
      <pointLight position={[0, OH - 0.45, cz]} intensity={glow} distance={4.5} decay={1.5} color={lightCol} />
      <pointLight position={[0, 0.5, cz - 0.3]} intensity={0.6 + 1.2 * heat} distance={3} decay={1.5} color={lightCol} />
      {/* Control panel above the door */}
      <Block p={[0, OH + 0.18, FRONT + 0.12]} s={[OW, 0.36, 0.28]} c="#2e3238" />
      <group position={DIAL}>
        <Cyl p={[0, 0, 0]} rad={0.11} h={0.05} r={[Math.PI / 2, 0, 0]} c="#d8dce0" metal />
        <group rotation={[0, 0, -heat * Math.PI * 1.5 + 0.75 * Math.PI]}>
          <Block p={[0, 0.06, -0.03]} s={[0.02, 0.09, 0.02]} c="#d8342c" />
        </group>
      </group>
      <Block p={[-0.35, 2.78, FRONT - 0.03]} s={[0.5, 0.16, 0.02]} c="#120808" e="#ff3a10" ei={0.6} />
      {/* Door, hinged on the left edge, swings toward the camera */}
      <group position={[-OW / 2, 0, FRONT]} rotation={[0, door * 1.75, 0]}>
        <group position={[OW / 2, 0, -0.04]}>
          <Block p={[0, 0.17, 0]} s={[OW, 0.14, 0.08]} c={STEEL} metal />
          <Block p={[0, OH - 0.13, 0]} s={[OW, 0.26, 0.08]} c={STEEL} metal />
          {[-1, 1].map((s) => <Block key={s} p={[s * (OW / 2 - 0.12), OH / 2, 0]} s={[0.24, OH, 0.08]} c={STEEL} metal />)}
          <mesh position={[0, (0.24 + OH - 0.26) / 2, 0]}>
            <boxGeometry args={[OW - 0.48, OH - 0.5, 0.02]} />
            <meshStandardMaterial color="#ffd9b0" transparent opacity={0.12 + 0.08 * heat} roughness={0.05} metalness={0.1} depthWrite={false} />
          </mesh>
          <Cyl p={[OW / 2 - 0.12, 1.35, -0.09]} rad={0.025} h={0.9} c="#3a3f47" metal />
        </group>
      </group>
    </group>
  );
};
