import {SkyDome} from '../../../shared/three/SkyDome';
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CameraRig, sampleColor, useGlowTexture, useRingTexture} from '../../../shared/three/common';
import {FPS, T, holeStateAt, rng, smooth} from '../world';

const HOLE_Z = -T.hole.startDistanceM;
const HOLE_Y = 1.4;
const N_GRASS = 6000;

const Grass: React.FC<{t: number; pull: number; suck: number}> = ({t, pull, suck}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const base = useMemo(() => {
    const r = rng(11);
    const a = new Float32Array(N_GRASS * 4);
    for (let i = 0; i < N_GRASS; i++) {
      a[i * 4] = (r() - 0.5) * 70; // x
      a[i * 4 + 1] = -75 + r() * 80; // z
      a[i * 4 + 2] = 0.6 + r() * 1.0; // hauteur
      a[i * 4 + 3] = r(); // variation de couleur
    }
    return a;
  }, []);
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.035, 0.55, 3);
    g.translate(0, 0.275, 0);
    return g;
  }, []);
  const tmp = useMemo(
    () => ({d: new THREE.Object3D(), q: new THREE.Quaternion(), axis: new THREE.Vector3(), c: new THREE.Color()}),
    [],
  );

  useLayoutEffect(() => {
    const m = ref.current!;
    for (let i = 0; i < N_GRASS; i++) {
      const v = base[i * 4 + 3];
      m.setColorAt(i, tmp.c.setHSL(0.26 + v * 0.06, 0.55, 0.26 + v * 0.2));
    }
    m.instanceColor!.needsUpdate = true;
  }, [base, tmp]);

  useLayoutEffect(() => {
    const m = ref.current!;
    const {d, q, axis} = tmp;
    for (let i = 0; i < N_GRASS; i++) {
      const x = base[i * 4];
      const z = base[i * 4 + 1];
      const h = base[i * 4 + 2];
      const dx = 0 - x;
      const dz = HOLE_Z - z;
      const dist = Math.hypot(dx, dz) + 1e-6;
      const ux = dx / dist;
      const uz = dz / dist;
      const tilt = Math.min(1.45, pull * 1.6 * (1 / (1 + dist / 60)));
      axis.set(uz, 0, -ux);
      q.setFromAxisAngle(axis, tilt);
      const shift = (suck * 7) / (1 + dist * 0.15);
      d.position.set(x + ux * shift, suck * 0.5 * Math.max(0, 1 - dist / 30), z + uz * shift);
      d.quaternion.copy(q);
      d.scale.set(1, h, 1);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[geo, undefined, N_GRASS] as any} frustumCulled={false}>
      <meshStandardMaterial flatShading />
    </instancedMesh>
  );
};

export const Park: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  const st = holeStateAt(t);
  const camZ = -(T.hole.startDistanceM - st.r);

  const top = sampleColor(T.sky, t, 'top');
  const bottom = sampleColor(T.sky, t, 'bottom');
  const pull = smooth(12, 19, t); // l'herbe penche déjà pendant « Chaque brin d'herbe se penche »
  const suck = smooth(20, 26.5, t);
  const glowK = smooth(15, 24, t);
  const ringOp = smooth(7, 8, t) * (1 - smooth(16, 18, t));

  const glow = useGlowTexture();
  const ring = useRingTexture();

  const trees = useMemo(() => {
    const r = rng(3);
    const out: {x: number; z: number; s: number}[] = [];
    while (out.length < 70) {
      const tr = {x: (r() - 0.5) * 90, z: -20 - r() * 110, s: 0.8 + r() * 0.9};
      // couloir dégagé : sinon la caméra traverse un arbre aspiré pendant la chute
      if (Math.abs(tr.x) < 10 && tr.z > -80) continue;
      out.push(tr);
    }
    return out;
  }, []);
  const people = useMemo(() => {
    const r = rng(9);
    const pal = ['#e0533d', '#3d7be0', '#f0c24a', '#8e5ad6', '#2fb6a0', '#e9e9e9', '#d6578f'];
    return Array.from({length: 36}, () => ({
      x: (r() - 0.5) * 36,
      z: -10 - r() * 36,
      c: pal[Math.floor(r() * pal.length)],
      d: r(),
      h: 0.95 + r() * 0.2,
    }));
  }, []);
  const city = useMemo(() => {
    const r = rng(21);
    return Array.from({length: 55}, () => {
      const w = 8 + r() * 14;
      const h = 25 + Math.pow(r(), 1.6) * 90;
      return {
        x: (r() - 0.5) * 380,
        z: -(190 + r() * 50),
        w,
        h,
        c: new THREE.Color().setHSL(0.6, 0.12, 0.33 + r() * 0.2),
      };
    });
  }, []);

  const axis = new THREE.Vector3();
  return (
    <>
      <CameraRig
        position={[Math.sin(t * 1.1) * 0.05, 1.6 + Math.sin(t * 1.7) * 0.03, camZ]}
        target={[0, HOLE_Y - 0.1, HOLE_Z]}
        fov={62}
      />
      <SkyDome top={top} bottom={bottom} />
      <fog attach="fog" args={[bottom, 70, 420]} />
      <hemisphereLight color={top} groundColor="#3b5a2a" intensity={1.1} />
      <directionalLight color={bottom} intensity={1.8} position={[40, 60, -10]} />

      {/* sol */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[800, 800]} />
        <meshStandardMaterial color="#3f7a30" />
      </mesh>
      <Grass t={t} pull={pull} suck={suck} />

      {/* skyline */}
      {city.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial color={b.c} />
        </mesh>
      ))}

      {/* arbres */}
      {trees.map((tr, i) => {
        const dx = 0 - tr.x;
        const dz = HOLE_Z - tr.z;
        const k = suck * 0.5;
        return (
          <group key={i} position={[tr.x + dx * k, 0, tr.z + dz * k]} scale={tr.s}>
            <mesh position={[0, 1, 0]}>
              <cylinderGeometry args={[0.18, 0.25, 2, 6]} />
              <meshStandardMaterial color="#5a3d25" flatShading />
            </mesh>
            <mesh position={[0, 3.2, 0]}>
              <icosahedronGeometry args={[1.6, 0]} />
              <meshStandardMaterial color="#3f8a3a" flatShading />
            </mesh>
          </group>
        );
      })}

      {/* personnages */}
      {people.map((p, i) => {
        const k = smooth(14 + p.d * 6, 20 + p.d * 6, t);
        const dx = 0 - p.x;
        const dz = HOLE_Z - p.z;
        const len = Math.hypot(dx, dz) + 1e-6;
        axis.set(dz / len, 0, -dx / len);
        const q = new THREE.Quaternion().setFromAxisAngle(axis, k * 1.45);
        return (
          <group key={i} position={[p.x * (1 - k), k * HOLE_Y, p.z + dz * k]} quaternion={q} scale={p.h}>
            <mesh position={[0, 0.15, 0]}>
              <boxGeometry args={[0.3, 0.3, 0.2]} />
              <meshStandardMaterial color="#2c3a55" flatShading />
            </mesh>
            <mesh position={[0, 0.65, 0]}>
              <boxGeometry args={[0.42, 0.75, 0.26]} />
              <meshStandardMaterial color={p.c} flatShading />
            </mesh>
            <mesh position={[0, 1.18, 0]}>
              <sphereGeometry args={[0.14, 8, 6]} />
              <meshStandardMaterial color="#e8b894" flatShading />
            </mesh>
          </group>
        );
      })}

      {/* le trou noir (rayon visuel exagéré : le vrai fait 9 mm) */}
      <group position={[0, HOLE_Y, HOLE_Z]}>
        <mesh>
          <sphereGeometry args={[0.05, 16, 12]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* plus brillant que le Soleil : le halo passe devant les arbres */}
        <sprite scale={[1 + 22 * glowK, 1 + 22 * glowK, 1]} renderOrder={10}>
          <spriteMaterial
            map={glow}
            transparent
            opacity={glowK}
            blending={THREE.AdditiveBlending}
            depthTest={false}
            depthWrite={false}
            fog={false}
          />
        </sprite>
        <sprite scale={[0.3 + 5 * glowK, 0.3 + 5 * glowK, 1]} renderOrder={11}>
          <spriteMaterial
            map={glow}
            transparent
            opacity={glowK}
            blending={THREE.AdditiveBlending}
            depthTest={false}
            depthWrite={false}
            fog={false}
          />
        </sprite>
        <sprite scale={[Math.max(0.5, st.r * 0.05), Math.max(0.5, st.r * 0.05), 1]}>
          <spriteMaterial map={ring} transparent opacity={ringOp} depthTest={false} fog={false} />
        </sprite>
      </group>
    </>
  );
};
