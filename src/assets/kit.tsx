import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';

/**
 * Briques communes à tous les assets : palette, matériaux, poutres.
 * Unités : mètres. Origine de chaque asset : au sol, au centre de son emprise. L'avant regarde vers -z.
 * Style : low-poly, faces plates (flatShading), couleurs franches — le même que les vidéos.
 */
export const PAL = {
  cream: '#e4d6bb', // pierre de taille
  stone: '#c9bb9e',
  stoneDark: '#9c8e74',
  zinc: '#6f7c8c', // toits en zinc
  zincDark: '#56616e',
  slate: '#3d4552',
  brick: '#a5674a',
  terracotta: '#b65a3a',
  iron: '#23272b', // ferronnerie, balcons
  glass: '#2b3644',
  glassLit: '#ffcf80',
  frame: '#efe9dc',
  tire: '#1b1c1e',
  rim: '#9aa3ab',
  chrome: '#c9ced3',
  wood: '#7a5a3c',
  hull: '#1f2a30',
  white: '#f2f0ea',
  eiffel: '#6b4a35', // « brun tour Eiffel »
  light: '#fff1c8',
  tail: '#d8291c',
};

export const BOX = new THREE.BoxGeometry(1, 1, 1);
/** Boîte posée : son origine est au milieu de la face du bas. */
export const BOX_UP = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
export const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
/** Prisme triangulaire (toit à deux pans) : base 1 × 1, faîte en haut, long de 1 selon z. */
export const PRISM = (() => {
  const s = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
  return new THREE.ExtrudeGeometry(s, {depth: 1, bevelEnabled: false}).translate(0, 0, -0.5);
})();
/** Toit mansardé : pyramide tronquée, base 1 × 1, haut 1. */
export const MANSARD = new THREE.CylinderGeometry(0.36, Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0);

type MatProps = {color: string; emissive?: string; emissiveIntensity?: number; opacity?: number; metal?: boolean; smooth?: boolean};
/** Matériau standard du kit (faces plates, mat). */
export const Mat: React.FC<MatProps> = ({color, emissive, emissiveIntensity = 0, opacity, metal, smooth}) => (
  <meshStandardMaterial
    color={color}
    flatShading={!smooth}
    roughness={metal ? 0.45 : 0.85}
    metalness={metal ? 0.4 : 0}
    emissive={emissive ?? '#000000'}
    emissiveIntensity={emissiveIntensity}
    transparent={opacity !== undefined && opacity < 1}
    opacity={opacity ?? 1}
  />
);

type V3 = [number, number, number];
/** Une boîte simple : position = centre, taille = [x, y, z]. */
export const Block: React.FC<{p: V3; s: V3; c: string; r?: V3; e?: string; ei?: number; o?: number; metal?: boolean}> = ({p, s, c, r, e, ei, o, metal}) => (
  <mesh position={p} scale={s} rotation={r} geometry={BOX}>
    <Mat color={c} emissive={e} emissiveIntensity={ei} opacity={o} metal={metal} />
  </mesh>
);

export type Seg = {a: THREE.Vector3; b: THREE.Vector3; w: number};
/**
 * Poutres entre deux points, regroupées dans un seul InstancedMesh (une treillis = un seul appel de dessin).
 * Calculé une fois : la géométrie est figée.
 */
export const Beams: React.FC<{segs: Seg[]; color: string; emissive?: string; emissiveIntensity?: number}> = ({segs, color, emissive, emissiveIntensity}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mats = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const o = new THREE.Object3D();
    return segs.map(({a, b, w}) => {
      const d = b.clone().sub(a);
      o.position.copy(a).add(b).multiplyScalar(0.5);
      o.quaternion.setFromUnitVectors(up, d.clone().normalize());
      o.scale.set(w, d.length(), w);
      o.updateMatrix();
      return o.matrix.clone();
    });
  }, [segs]);
  useLayoutEffect(() => {
    const m = ref.current!;
    mats.forEach((mx, i) => m.setMatrixAt(i, mx));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [mats]);
  return (
    <instancedMesh ref={ref} args={[BOX, undefined, segs.length] as any}>
      <Mat color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} metal />
    </instancedMesh>
  );
};

/** RNG déterministe pour les variantes (même graine = même asset). */
export const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Cylindre posé debout : position = centre, rayon, hauteur. `r` pour le coucher (ex. [0, 0, Math.PI / 2]). */
export const Cyl: React.FC<{p: V3; rad: number; h: number; c: string; r?: V3; e?: string; ei?: number; metal?: boolean; seg?: number}> = ({p, rad, h, c, r, e, ei, metal, seg = 14}) => (
  <mesh position={p} rotation={r}>
    <cylinderGeometry args={[rad, rad, h, seg]} />
    <Mat color={c} emissive={e} emissiveIntensity={ei} metal={metal} />
  </mesh>
);

/** Boule low-poly (feuillage, abat-jour, fruits…). */
export const Ball: React.FC<{p: V3; rad: number; c: string; s?: V3; e?: string; ei?: number; detail?: number}> = ({p, rad, c, s, e, ei, detail = 1}) => (
  <mesh position={p} scale={s ? [s[0] * rad, s[1] * rad, s[2] * rad] : rad}>
    <icosahedronGeometry args={[1, detail]} />
    <Mat color={c} emissive={e} emissiveIntensity={ei} />
  </mesh>
);
