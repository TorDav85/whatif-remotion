import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CameraRig, Stars, useGlowTexture} from '../scenes/common';
import {EarthGlobe, hotspotVector, lonLatUV} from '../scenes/Earth';
import {sampleNum} from '../world';
import {FPS, G, plumeAt, tauAt} from './time';

const PARIS = lonLatUV(2.35, 48.86);
const EXAGGERATION = 200; // 15 km sur 6 371 km serait invisible : on étire le panache
const R_EARTH = G.physics.earthRadiusM;

/** La Terre vue de l'espace : un panache blanc sort de Paris. */
export const Globe: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  const tau = tauAt(t);
  const dist = sampleNum(G.earth as any, t, 'dist');
  const glow = useGlowTexture();
  const hp = useMemo(() => hotspotVector(PARIS.hu, PARIS.hv), []);
  const yaw = Math.atan2(-hp.x, hp.z);
  const n = useMemo(
    () => hp.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.55),
    [hp, yaw],
  );
  const len = (plumeAt(tau) / R_EARTH) * EXAGGERATION;

  return (
    <>
      <color attach="background" args={['#05060b']} />
      {/* vue de biais : Paris près du bord du globe, pour voir le panache de profil */}
      <CameraRig position={[dist * 0.72, n.y * 0.5, dist * 0.7]} target={[0, n.y * 0.35, 0]} fov={45} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 2, 5]} intensity={2.4} />
      <Stars />
      <EarthGlobe hu={PARIS.hu} hv={PARIS.hv} />
      {/* le panache : une file de halos le long de la verticale de Paris */}
      {Array.from({length: 20}, (_, i) => {
        const k = i / 19;
        const p = n.clone().multiplyScalar(1.005 + len * k);
        const s = 0.07 + 0.18 * k;
        return (
          <sprite key={i} position={p} scale={[s, s, 1]} renderOrder={5}>
            <spriteMaterial map={glow} color="#f4f8ff" transparent opacity={0.75 * (1 - k * 0.4)} depthTest={false} depthWrite={false} />
          </sprite>
        );
      })}
      <sprite position={n.clone().multiplyScalar(1.01)} scale={[0.16, 0.16, 1]} renderOrder={6}>
        <spriteMaterial map={glow} color="#ffe6b0" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
    </>
  );
};
