import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CameraRig, Stars, useGlowTexture} from '../../../shared/three/common';
import {FPS, T, sampleNum} from '../world';
import {EarthGlobe, hotspotVector} from '../../../shared/three/EarthGlobe';

export const Earth: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  const cam = sampleNum(T.earth, t, 'camDist');
  const spin = sampleNum(T.earth, t, 'spin');
  const hotspot = sampleNum(T.earth, t, 'hotspot');
  const fire = sampleNum(T.earth, t, 'fire');
  const glow = useGlowTexture();
  const hp = useMemo(() => hotspotVector(), []);
  const yaw = Math.atan2(-hp.x, hp.z);

  // Le point lumineux suit la rotation de la Terre (mêmes transformations que le globe)
  const spot = useMemo(() => new THREE.Vector3(), []);
  spot.copy(hp).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw + spin).applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.55);
  spot.multiplyScalar(1.03);

  return (
    <>
      <color attach="background" args={['#05060b']} />
      <CameraRig position={[0, 0.2, cam]} target={[0, 0, 0]} fov={45} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 2, 5]} intensity={2.4} />
      <Stars />
      <EarthGlobe fire={fire} spin={spin} />

      {/* « second soleil » sur New York */}
      <sprite position={spot} scale={[0.5 * hotspot, 0.5 * hotspot, 1]} renderOrder={5}>
        <spriteMaterial map={glow} transparent blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} />
      </sprite>

      {/* boule de feu */}
      <sprite position={[0, 0, 1.4]} scale={[fire * 3.4 + 0.001, fire * 3.4 + 0.001, 1]}>
        <spriteMaterial color="#ff3a12" map={glow} transparent opacity={0.95 * fire} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} />
      </sprite>
      <sprite position={[0, 0, 1.45]} scale={[fire * 1.5 + 0.001, fire * 1.5 + 0.001, 1]}>
        <spriteMaterial color="#ffe2b0" map={glow} transparent opacity={fire} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} />
      </sprite>
    </>
  );
};
