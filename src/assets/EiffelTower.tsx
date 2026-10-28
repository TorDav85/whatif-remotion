import React, {useMemo} from 'react';
import * as THREE from 'three';
import {BOX_UP, Beams, Block, Mat, PAL, Seg} from './kit';

export type EiffelTowerProps = {
  /** hauteur totale (m) ; la vraie fait 330 m, les vidéos utilisent ~110 */
  height?: number;
  color?: string;
  /** illumination dorée du soir (0..1) */
  lit?: number;
  /** balise rouge au sommet (0..1) */
  beacon?: number;
};

// Profil de la tour pour une hauteur de 100 : demi-largeur de la base de chaque pilier → sommet.
const H1 = 21; // 1er étage
const H2 = 38; // 2e étage
const H3 = 90; // sommet de la structure
const B0 = 31; // demi-écartement des pieds au sol
const B1 = 17; // au 1er étage
const B2 = 9;
const B3 = 1.6;
const LEG0 = 8; // largeur d'un pilier au sol
const LEG1 = 5.5;

/**
 * Tour inspirée de la tour Eiffel : quatre piliers en treillis, arches, deux plateformes,
 * fût qui s'effile, campanile et antenne. Toute la ferronnerie est un seul treillis instancié.
 */
export const EiffelTower: React.FC<EiffelTowerProps> = ({height = 100, color = PAL.eiffel, lit = 0, beacon = 0}) => {
  const segs = useMemo(() => {
    const out: Seg[] = [];
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const add = (a: THREE.Vector3, b: THREE.Vector3, w: number) => out.push({a, b, w});
    /** Un tronçon de treillis : un carré qui monte de (c0, half0) à (c1, half1), avec croix sur les 4 faces. */
    const section = (cx0: number, cz0: number, h0: number, y0: number, cx1: number, cz1: number, h1: number, y1: number, n: number, w: number) => {
      const corner = (cx: number, cz: number, h: number, y: number, i: number) => {
        const sx = i & 1 ? 1 : -1;
        const sz = i & 2 ? 1 : -1;
        return v(cx + sx * h, y, cz + sz * h);
      };
      for (let k = 0; k < n; k++) {
        const f0 = k / n;
        const f1 = (k + 1) / n;
        // la courbure des piliers : on interpole en douceur (profil légèrement concave)
        const ease = (f: number) => 1 - Math.pow(1 - f, 1.35);
        const at = (f: number) => [
          cx0 + (cx1 - cx0) * ease(f),
          cz0 + (cz1 - cz0) * ease(f),
          h0 + (h1 - h0) * f,
          y0 + (y1 - y0) * f,
        ] as const;
        const [ax, az, ah, ay] = at(f0);
        const [bx, bz, bh, by] = at(f1);
        const A = [0, 1, 3, 2].map((i) => corner(ax, az, ah, ay, i));
        const B = [0, 1, 3, 2].map((i) => corner(bx, bz, bh, by, i));
        for (let i = 0; i < 4; i++) {
          const j = (i + 1) % 4;
          add(A[i], B[i], w); // arêtes
          add(A[i], B[j], w * 0.45); // croix de Saint-André
          add(A[j], B[i], w * 0.45);
          add(B[i], B[j], w * 0.6); // ceinture
        }
      }
    };
    // quatre piliers jusqu'au 1er étage
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) section(sx * B0, sz * B0, LEG0 / 2, 0, sx * B1, sz * B1, LEG1 / 2, H1, 6, 0.55);
    // du 1er au 2e étage : les piliers se rapprochent
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) section(sx * B1, sz * B1, LEG1 / 2, H1, sx * B2, sz * B2, 2.6, H2, 5, 0.45);
    // fût : les quatre piliers se rejoignent
    section(0, 0, B2 + 2.6, H2, 0, 0, B3, H3, 12, 0.5);
    // arches entre les piliers (sous le 1er étage)
    const arch = (axis: 'x' | 'z', side: number) => {
      const N = 14;
      const r = B0 - LEG0 / 2 - 3;
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI;
        const a1 = ((i + 1) / N) * Math.PI;
        const p = (a: number) => {
          const u = -Math.cos(a) * r;
          const y = 4 + Math.sin(a) * (H1 - 7);
          return axis === 'x' ? v(u, y, side * (B0 - 6)) : v(side * (B0 - 6), y, u);
        };
        add(p(a0), p(a1), 0.7);
      }
    };
    for (const s of [-1, 1]) {
      arch('x', s);
      arch('z', s);
    }
    return out;
  }, []);

  const glow = lit * 0.6;
  return (
    <group scale={height / 100}>
      <Beams segs={segs} color={color} emissive="#ffa040" emissiveIntensity={glow} />
      {/* plateformes */}
      <mesh position={[0, H1, 0]} scale={[2 * B1 + 4, 2.2, 2 * B1 + 4]} geometry={BOX_UP}>
        <Mat color={color} emissive="#ffa040" emissiveIntensity={glow} />
      </mesh>
      <mesh position={[0, H2, 0]} scale={[2 * B2 + 7, 1.8, 2 * B2 + 7]} geometry={BOX_UP}>
        <Mat color={color} emissive="#ffa040" emissiveIntensity={glow} />
      </mesh>
      {/* campanile et antenne */}
      <Block p={[0, H3 + 1.6, 0]} s={[4.2, 3.2, 4.2]} c={color} e="#ffa040" ei={glow} />
      <Block p={[0, H3 + 4, 0]} s={[2.4, 1.6, 2.4]} c={color} e="#ffa040" ei={glow} />
      <Block p={[0, H3 + 7.5, 0]} s={[0.35, 6, 0.35]} c={PAL.chrome} metal />
      <mesh position={[0, H3 + 10.6, 0]} scale={0.6}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={beacon > 0 ? '#ff4030' : '#5a1a14'} />
      </mesh>
    </group>
  );
};
