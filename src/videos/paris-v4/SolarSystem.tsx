import React, {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {CameraRig, useGlowTexture} from '../../shared/three/common';
import {rng, smooth} from '../../core/animation';
import {ALL_PLANET_TEXTURES, PlanetTexture, usePlanetTextures} from './PlanetTextures';
import {parisVector, PlaceLabel, PlanetAir, StarField} from './Cosmos';
import P from './scenario.json';

type PlanetData = (typeof P.solar.planets)[number];
const FROM = P.shots.find((s) => s.id === 'solar')!.from;
const TO = P.shots.find((s) => s.id === 'solar')!.to;
const rad = (n: number) => n * Math.PI / 180;

export const planetPosition = (planet: PlanetData, t: number) => {
  const a = planet.angle + (t - FROM) * planet.speed;
  const z = Math.sin(a) * planet.orbit;
  return new THREE.Vector3(Math.cos(a) * planet.orbit, z * Math.sin(rad(planet.inclination)), z * Math.cos(rad(planet.inclination)));
};

export const solarCameraAt = (t: number) => {
  const k = smooth(FROM, FROM + P.solar.duration, t);
  const earth = planetPosition(P.solar.planets.find((p) => p.id === 'earth')!, t);
  const target = earth.multiplyScalar(1 - k);
  const position = target.clone().add(new THREE.Vector3(k * 34, 6 + k * 234, 12 + k * 253));
  return {k, target, position};
};

/** Les anneaux emploient la bande de texture radiale fournie par le dépôt. */
const PlanetRing: React.FC<{map: THREE.Texture; uranus?: boolean}> = ({map, uranus = false}) => {
  const geometry = useMemo(() => {
    const inner = uranus ? 1.4 : 1.3;
    const outer = uranus ? 1.75 : 2.35;
    const g = new THREE.RingGeometry(inner, outer, 128, 2);
    const positions = g.getAttribute('position');
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) uv.setXY(i, (Math.hypot(positions.getX(i), positions.getY(i)) - inner) / (outer - inner), 0.5);
    return g;
  }, [uranus]);
  return <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
    <meshPhongMaterial map={map} side={THREE.DoubleSide} transparent opacity={uranus ? 0.65 : 0.9} depthWrite={false} shininess={2} />
  </mesh>;
};

const Orbit: React.FC<{planet: PlanetData; t: number}> = ({planet, t}) => {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(Array.from({length: 256}, (_, i) => {
    const a = i / 256 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * planet.orbit, Math.sin(a) * planet.orbit * Math.sin(rad(planet.inclination)), Math.sin(a) * planet.orbit * Math.cos(rad(planet.inclination)));
  })), [planet]);
  const angle = planet.angle + (t - FROM) * planet.speed;
  return <>
    <lineLoop geometry={geometry}><lineBasicMaterial color={planet.id === 'earth' ? '#f3d48d' : '#7e8e9b'} transparent opacity={planet.id === 'earth' ? 0.65 : 0.26} depthWrite={false} /></lineLoop>
    <group rotation={[Math.PI / 2 - rad(planet.inclination), 0, 0]}>
      <mesh rotation={[0, 0, angle - 0.65]}><ringGeometry args={[planet.orbit - 0.035, planet.orbit + 0.035, 96, 1, 0, 0.65]} /><meshBasicMaterial color={planet.id === 'earth' ? '#ffe1a5' : '#91c6e5'} transparent opacity={0.75} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    </group>
  </>;
};

export const SolarSystem: React.FC<{from: number}> = ({from}) => {
  const t = from + useCurrentFrame() / P.fps;
  const elapsed = t - from;
  const {k, position, target} = solarCameraAt(t);
  const maps = usePlanetTextures(ALL_PLANET_TEXTURES);
  const glow = useGlowTexture();
  const earthOrientation = useMemo(() => new THREE.Quaternion().setFromUnitVectors(parisVector(), new THREE.Vector3(0, 0, 1)), []);
  const asteroids = useMemo(() => {
    const r = rng(501); const positions: number[] = [];
    for (let i = 0; i < 700; i++) {const a = r() * Math.PI * 2; const radius = 26 + r() * 2.5; positions.push(Math.cos(a) * radius, (r() - 0.5) * 0.7, Math.sin(a) * radius);}
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  }, []);
  if (!maps) return null;
  return <>
    <color attach="background" args={['#030b1b']} />
    <CameraRig position={position.toArray() as [number, number, number]} target={target.toArray() as [number, number, number]} fov={48} />
    <StarField radius={600} />
    <ambientLight color="#cfddf5" intensity={0.65} />
    <pointLight position={[0, 0, 0]} color="#fff1d5" intensity={2.7} decay={0} />
    <group rotation={[0, elapsed * 0.09, 0]}>
      <mesh><sphereGeometry args={[P.solar.sunRadius, 64, 48]} /><meshBasicMaterial map={maps.sun} color="#ffdc89" toneMapped={false} /></mesh>
    </group>
    <sprite scale={[P.solar.sunRadius * 6, P.solar.sunRadius * 6, 1]}><spriteMaterial map={glow} color="#ffbd55" opacity={0.4 + Math.sin(t * 0.7) * 0.025} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
    <PlaceLabel text="SOLEIL" scale={[10 + k * 22, 1.25 + k * 2.75, 1]} position={[0, P.solar.sunRadius + 1 + k * 5, 0]} />
    <points geometry={asteroids}><pointsMaterial color="#9e9b88" size={0.12} transparent opacity={0.6} depthWrite={false} /></points>
    {P.solar.planets.map((planet) => {
      const pos = planetPosition(planet, t);
      const isEarth = planet.id === 'earth';
      return <React.Fragment key={planet.id}>
        <Orbit planet={planet} t={t} />
        <group position={pos} scale={planet.radius}>
          <group rotation={isEarth ? [0, 0.45 + elapsed * 0.05, 0] : [0, 0, rad(planet.tilt)]}>
            <group quaternion={isEarth ? earthOrientation : undefined} rotation={isEarth ? undefined : [0, elapsed * 0.18, 0]}>
              <mesh><sphereGeometry args={[1, 64, 48]} /><meshPhongMaterial map={maps[planet.id as PlanetTexture]} shininess={isEarth ? 14 : 4} specular={isEarth ? '#627e8b' : '#333333'} /></mesh>
              {isEarth && <><PlanetAir clouds /><PlanetAir /></>}
            </group>
            {planet.id === 'saturn' && <PlanetRing map={maps.saturnring!} />}
            {planet.id === 'uranus' && <PlanetRing map={maps.uranusring!} uranus />}
          </group>
          {isEarth && <>
            <group rotation={[0, elapsed * 0.27 + 0.9, 0]}>
              <mesh position={[P.solar.moonOrbit, 0.1, 0]}><sphereGeometry args={[P.solar.moonRadius, 32, 24]} /><meshPhongMaterial map={maps.moon} shininess={1} /></mesh>
            </group>
            <sprite scale={[2.8, 2.8, 1]}><spriteMaterial map={glow} color="#fadd98" opacity={0.15 + k * 0.12} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
          </>}
        </group>
      </React.Fragment>;
    })}
  </>;
};

/** Étiquettes projetées et espacées pour que les huit noms restent lisibles en portrait. */
export const SolarLabels: React.FC<{t: number}> = ({t}) => {
  const {width, height} = useVideoConfig();
  const {position, target} = solarCameraAt(t);
  const camera = new THREE.PerspectiveCamera(48, width / height, 0.05, 1500);
  camera.position.copy(position); camera.lookAt(target); camera.updateMatrixWorld();
  const opacity = smooth(FROM + 0.5, FROM + 1.5, t) * (1 - smooth(TO - 1.3, TO - 0.5, t));
  const labels = P.solar.planets.map((planet) => {
    const projected = planetPosition(planet, t).project(camera);
    return {planet, x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2, depth: projected.z, labelY: 0};
  }).filter((p) => p.depth > -1 && p.depth < 1 && p.x > 30 && p.x < width - 30 && p.y > 430 && p.y < 1480);
  for (const left of [true, false]) {
    const column = labels.filter((p) => (p.x < width / 2) === left).sort((a, b) => a.y - b.y);
    let last = 445;
    for (const p of column) {p.labelY = Math.max(490, p.y - 30, last + 64); last = p.labelY;}
    const overflow = Math.max(0, last - 1440);
    column.forEach((p) => {p.labelY -= overflow;});
  }
  return <svg width={width} height={height} style={{position: 'absolute', inset: 0, opacity}}>
    {labels.map((p) => {
      const left = p.x < width / 2;
      const x = left ? 100 : width - 100;
      const accent = p.planet.id === 'earth' ? '#ffe0a0' : '#e5ddc4';
      return <g key={p.planet.id}>
        <path d={`M${p.x} ${p.y} L${left ? x + 105 : x - 105} ${p.labelY - 7} H${x}`} fill="none" stroke={accent} strokeWidth={1.2} opacity={0.65} />
        <circle cx={p.x} cy={p.y} r={2.8} fill={accent} />
        <text x={x} y={p.labelY - 18} textAnchor={left ? 'start' : 'end'} fontFamily="Arial, sans-serif" fontSize={21} fontWeight={600} fill={accent} stroke="#071222" strokeWidth={4} paintOrder="stroke">{p.planet.name}</text>
      </g>;
    })}
  </svg>;
};
