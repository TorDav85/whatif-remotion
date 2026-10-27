import React from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CameraRig, Stars, useGlowTexture, useRingTexture} from './common';
import {EarthGlobe} from './Earth';
import {FPS, smooth} from '../world';

/** Échelle : un trou noir « de la masse du Soleil » (taille exagérée) au centre, la Terre continue d'orbiter. */
export const Scale: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  const k = smooth(37, 42, t);
  const glow = useGlowTexture();
  const ring = useRingTexture();
  // orbite inclinée, assez serrée pour tenir dans le cadre vertical
  const a = (t - from) * 0.7 - 0.6;
  const ex = Math.cos(a) * 1.3;
  const ez = Math.sin(a) * 1.3;
  return (
    <>
      <color attach="background" args={['#05060b']} />
      <CameraRig position={[0, 4.6, 5.6 - k * 0.8]} target={[0, 0, 0]} fov={50} />
      <ambientLight intensity={0.35} />
      {/* la lumière vient du centre : la Terre est éclairée côté trou noir */}
      <pointLight position={[0, 0, 0]} intensity={14} decay={1.2} />
      <Stars />
      <group position={[ex, 0, ez]} scale={0.5}>
        <EarthGlobe spin={t * 0.2} />
      </group>
      <group>
        <mesh>
          <sphereGeometry args={[0.22, 24, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <sprite scale={[1.1, 1.1, 1]} renderOrder={2}>
          <spriteMaterial map={ring} transparent opacity={0.9} depthWrite={false} />
        </sprite>
        {/* halo placé derrière la sphère pour qu'elle reste noire */}
        <sprite position={[0, -0.14, -0.45]} scale={[2.2, 2.2, 1]} renderOrder={1}>
          <spriteMaterial map={glow} transparent opacity={0.45} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      </group>
    </>
  );
};
