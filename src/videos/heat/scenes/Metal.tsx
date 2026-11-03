import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CameraRig} from '../../../shared/three/common';
import {rng, smooth} from '../../../core/animation';
import {FPS, tempAt} from '../curve';
import {C, CYL, ICO, Inst, useGlow} from '../kit';

const L = 7; // longueur des barres de la rambarde
const BARS = [2.6, 1.9, 1.2];

/** Barre métallique dont les sommets s'affaissent (déformation recalculée à chaque frame). */
const Bar: React.FC<{y: number; melt: number; t: number; idx: number; col: THREE.Color; em: THREE.Color}> = ({y, melt, t, idx, col, em}) => {
  const {geo, base} = useMemo(() => {
    const g = new THREE.BoxGeometry(L, 0.2, 0.2, 60, 1, 1);
    return {geo: g, base: Float32Array.from(g.attributes.position.array as Float32Array)};
  }, []);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    const u = (2 * x) / L;
    const sag = (1 - u * u) * (0.9 + 0.25 * idx) * melt * melt;
    // gouttes qui s'étirent sous la barre : bosses le long de x
    const drip = Math.max(0, Math.sin(x * 2.3 + idx * 2)) ** 14 * melt * (0.55 + 0.15 * Math.sin(t * 1.7 + x));
    const lower = base[i * 3 + 1] < 0 ? drip : 0;
    pos.setY(i, base[i * 3 + 1] - sag - lower);
    pos.setZ(i, base[i * 3 + 2] * (1 + melt * 0.6 * (base[i * 3 + 1] < 0 ? 1 : 0.3)));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return (
    <mesh geometry={geo} position={[0, y, 0]}>
      <meshStandardMaterial color={col} emissive={em} metalness={0.6} roughness={0.35} flatShading />
    </mesh>
  );
};

export const Metal: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  const c = tempAt(t);
  const k = (t - from) / 5.6;
  const melt = smooth(640, 880, c);
  const glow = useGlow();
  // couleur du métal : rouge sombre → orange → jaune pâle quand il coule
  const hot = C('#7a1e0a').lerp(C('#ff6a12'), smooth(650, 800, c)).lerp(C('#ffd27a'), smooth(800, 900, c));
  const em = hot.clone().multiplyScalar(0.55 + 0.25 * melt);
  const metal = C('#8a8f96').lerp(hot, 0.7);

  const drops = useMemo(() => {
    const r = rng(111);
    return Array.from({length: 40}, () => [(r() - 0.5) * L * 0.8, Math.floor(r() * 3), r(), 0.6 + r() * 0.6] as const);
  }, []);
  const bokeh = useMemo(() => {
    const r = rng(113);
    return Array.from({length: 22}, () => [(r() - 0.5) * 30, r() * 14, -14 - r() * 20, 1.5 + r() * 3.5, r()] as const);
  }, []);

  return (
    <>
      <CameraRig position={[-2.4 + k * 3, 2.3 - k * 0.3, 7.6 - k * 1.2]} target={[0.2 + k * 0.5, 1.4 - k * 0.2, 0]} fov={46} />
      {/* fond sombre : le métal en fusion est la seule vraie source de lumière */}
      <color attach="background" args={["#1c0603"]} />
      <fog attach="fog" args={["#1c0603", 8, 40]} />
      <ambientLight color="#ff6a3a" intensity={0.35} />
      <pointLight position={[0.5, 0.6, 2.5]} color="#ffb060" intensity={18 + melt * 30} decay={1.6} />
      {/* poteaux */}
      {[-L / 2, L / 2].map((x) => (
        <mesh key={x} position={[x, 0, 0]} scale={[0.28, 3 - melt * 0.4, 0.28]} geometry={CYL}>
          <meshStandardMaterial color={metal} emissive={em} metalness={0.6} roughness={0.35} flatShading />
        </mesh>
      ))}
      {BARS.map((y, i) => (
        <Bar key={i} y={y} melt={melt} t={t} idx={i} col={metal} em={em} />
      ))}
      {/* gouttes qui tombent en boucle */}
      <Inst
        count={drops.length}
        geo={ICO}
        basic
        update={(i, d, col) => {
          const [x, bar, ph, sp] = drops[i];
          if (melt < 0.15) return d.scale.set(0, 0, 0);
          const u = (2 * x) / L;
          const y0 = BARS[bar] - (1 - u * u) * (0.9 + 0.25 * bar) * melt * melt - 0.15;
          const age = (t * sp + ph) % 1;
          const y = y0 - 4.9 * (age * 0.9) ** 2;
          if (y < 0.05) return d.scale.set(0, 0, 0);
          d.position.set(x, y, 0);
          const stretch = 1 + age * 3;
          d.scale.set(0.07, 0.07 * stretch, 0.07);
          col.copy(hot).multiplyScalar(1.3);
        }}
      />
      {/* flaque de métal en fusion qui s'étale */}
      <mesh position={[0.3, 0.02, 0.2]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.2 + melt * 4.2, 0.2 + melt * 2.2, 1]}>
        <circleGeometry args={[1, 12]} />
        <meshBasicMaterial color={hot.clone().multiplyScalar(1.1)} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={C('#1a0a08')} emissive={C('#ff3a10').multiplyScalar(0.04 + melt * 0.06)} />
      </mesh>
      {/* bokeh : lueurs floues à l'arrière-plan */}
      {bokeh.map(([x, y, z, s, ph], i) => (
        <sprite key={i} position={[x, y, z]} scale={[s, s, 1]}>
          <spriteMaterial map={glow} color={C('#ff7a2a').lerp(C('#ffd27a'), ph)} transparent opacity={0.55 + 0.25 * Math.sin(t * 2 + ph * 9)} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
        </sprite>
      ))}
    </>
  );
};
