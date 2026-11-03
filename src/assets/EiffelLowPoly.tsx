import React, {useMemo} from 'react';
import * as THREE from 'three';

/** Tour Eiffel stylisée des vidéos Paris (extraite de paris-v2 en 1.12). Défauts : position et hauteur de paris-v2. */
const Beam: React.FC<{a: [number, number, number]; b: [number, number, number]; width: number; color: THREE.Color}> = ({a, b, width, color}) => {
  const {pos, q, length} = useMemo(() => {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const dir = end.clone().sub(start);
    return {pos: start.add(end).multiplyScalar(0.5), length: dir.length(), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())};
  }, [a.join(','), b.join(',')]);
  return <mesh position={pos} quaternion={q}><boxGeometry args={[width, length, width]} /><meshStandardMaterial color={color} metalness={0.45} roughness={0.6} /></mesh>;
};

/** Silhouette stylisée : quatre pieds évasés, deux plateformes et croisillons. */
export const EiffelLowPoly: React.FC<{bend: number; glow: number; z?: number; height?: number}> = ({bend, glow, z = -170, height = 76}) => {
  const color = new THREE.Color('#74604c').lerp(new THREE.Color('#d28b58'), glow * 0.6);
  const levels = [[0, 12], [22, 6], [43, 3.2], [68, 0.6]] as const;
  return (
    <group position={[0, 0, z]} scale={height / 76}>
      <group rotation={[bend * 0.13, 0, -bend * 0.06]}>
        {[-1, 1].flatMap((sx) => [-1, 1].flatMap((sz) => levels.slice(0, -1).map(([y, r], i) => {
          const [ny, nr] = levels[i + 1];
          return <Beam key={`${sx}:${sz}:${i}`} a={[sx * r, y, sz * r]} b={[sx * nr, ny, sz * nr]} width={i === 0 ? 1.1 : 0.65} color={color} />;
        })))}
        {[22, 43].map((y, i) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[i ? 8 : 15, 1.1, i ? 8 : 15]} /><meshStandardMaterial color={color} /></mesh>)}
        {levels.slice(0, -1).flatMap(([y, r], i) => {
          const [ny, nr] = levels[i + 1];
          return [-1, 1].flatMap((sign) => [false, true].flatMap((swap) => [false, true].map((cross) => {
            const a: [number, number, number] = [cross ? -r : r, y + 2, sign * r];
            const b: [number, number, number] = [cross ? nr : -nr, ny - 1, sign * nr];
            return <Beam key={`${i}:${sign}:${swap}:${cross}`} a={swap ? [a[2], a[1], a[0]] : a} b={swap ? [b[2], b[1], b[0]] : b} width={0.22} color={color} />;
          })));
        })}
        {[-1, 1].map((s) => <mesh key={s} position={[0, 6, s * 9]}><torusGeometry args={[8, 0.4, 5, 20, Math.PI]} /><meshStandardMaterial color={color} /></mesh>)}
        <Beam a={[0, 67, 0]} b={[0, 76, 0]} width={0.4} color={color} />
      </group>
    </group>
  );
};

