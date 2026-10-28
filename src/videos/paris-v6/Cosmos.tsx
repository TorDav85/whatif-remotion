import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CameraRig, useGlowTexture} from '../../shared/three/common';
import {rng, smooth} from '../../core/animation';
import P from './scenario.json';
import land from '../paris-v3/land.json';
import {ColdWater} from './Winter';
import {EARTH_TEXTURES, usePlanetTextures} from './PlanetTextures';

const lonScale = Math.cos(P.geography.parisLat * Math.PI / 180);
const xy = (coord: number[]) => new THREE.Vector2((coord[0] - P.geography.parisLon) * lonScale, coord[1] - P.geography.parisLat);

export const PlaceLabel: React.FC<{text: string; scale: [number, number, number]; position: [number, number, number]}> = ({text, scale, position}) => {
  const map = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '500 43px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#020814'; ctx.shadowBlur = 12; ctx.fillStyle = '#ffe5b7';
    ctx.fillText(text, 384, 48);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }, [text]);
  return <sprite position={position} scale={scale}><spriteMaterial map={map} transparent depthTest={false} depthWrite={false} /></sprite>;
};

export const PlanetAir: React.FC<{clouds?: boolean}> = ({clouds = false}) => {
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: clouds ? THREE.NormalBlending : THREE.AdditiveBlending,
    vertexShader: `varying vec3 vP; varying vec3 vW; varying vec3 vN;
      void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: clouds ? `varying vec3 vP; varying vec3 vW; varying vec3 vN;
      void main(){vec3 p=vP*11.0; float n=sin(p.x+sin(p.z*0.8))*sin(p.y*1.3+sin(p.x*0.5))+0.45*sin(p.z*2.2+p.x)*sin(p.y*2.7);
      float a=smoothstep(0.5,1.15,n)*0.28; gl_FragColor=vec4(vec3(0.9,0.95,1.0),a);
      #include <colorspace_fragment>
      }` : `varying vec3 vP; varying vec3 vW; varying vec3 vN;
      void main(){float rim=pow(1.0-abs(dot(normalize(vN),normalize(cameraPosition-vW))),3.4);
      gl_FragColor=vec4(0.22,0.48,0.9,rim*0.55);
      #include <colorspace_fragment>
      }`,
  }), [clouds]);
  return <mesh material={material}><sphereGeometry args={[clouds ? 1.012 : 1.045, 64, 48]} /></mesh>;
};

const Beacon: React.FC<{size: number; opacity?: number}> = ({size, opacity = 1}) => {
  const glow = useGlowTexture();
  return <>
    <sprite scale={[size * 4, size * 4, 1]}><spriteMaterial map={glow} color="#ffb862" transparent opacity={0.6 * opacity} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} /></sprite>
    <mesh><sphereGeometry args={[size * 0.12, 12, 8]} /><meshBasicMaterial color="#fff0bb" transparent opacity={opacity} depthTest={false} /></mesh>
  </>;
};

export const Country: React.FC<{from: number}> = ({from}) => {
  const t = from + useCurrentFrame() / P.fps;
  const k = smooth(from, from + P.zoom.countryDuration, t);
  const distance = 0.85 * Math.pow(56, k);
  const shapes = useMemo(() => land.flatMap((country, ci) => country.polygons.flatMap((polygon, pi) => {
    const outer = polygon[0];
    if (!outer.some(([lon, lat]) => lon > -25 && lon < 40 && lat > 28 && lat < 67)) return [];
    const shape = new THREE.Shape(outer.map(xy));
    for (const ring of polygon.slice(1)) shape.holes.push(new THREE.Path(ring.map(xy)));
    const edge = new THREE.BufferGeometry().setFromPoints(outer.map((c) => {const v = xy(c); return new THREE.Vector3(v.x, v.y, 0.03);}));
    return [{id: `${ci}:${pi}`, geometry: new THREE.ShapeGeometry(shape), edge, france: country.code === 'FRA', tone: ci % 4}];
  })), []);
  const cities = useMemo(() => [[2.3522, 48.8566], [4.83, 45.76], [5.37, 43.3], [-0.58, 44.84], [1.44, 43.6], [-1.55, 47.22], [7.75, 48.58], [3.06, 50.63], [7.26, 43.7]].map(xy), []);
  return <>
    <color attach="background" args={['#081824']} />
    <CameraRig position={[0, -2.2 * k, distance]} target={[0, -2.2 * k, 0]} fov={42} />
    <mesh position={[0, 0, -0.05]}><planeGeometry args={[200, 160]} /><ColdWater t={t} xy density={0.55} /></mesh>
    {shapes.map((s) => <group key={s.id}>
      <mesh geometry={s.geometry}><meshBasicMaterial color={s.france ? '#8faab8' : ['#5a7180', '#6d818b', '#718f9c', '#8c9c9f'][s.tone]} /></mesh>
      <lineLoop geometry={s.edge}><lineBasicMaterial color={s.france ? '#c8dce5' : '#9eb4c0'} transparent opacity={s.france ? 1 : 0.6} /></lineLoop>
    </group>)}
    {/* Quelques axes convergent vers Paris ; ils restent secondaires à la géographie. */}
    {cities.slice(1).map((city, i) => {
      const points = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.035), new THREE.Vector3(city.x, city.y, 0.035)]);
      return <lineSegments key={i} geometry={points}><lineBasicMaterial color="#b9a87a" transparent opacity={0.2} /></lineSegments>;
    })}
    {cities.map((city, i) => <mesh key={i} position={[city.x, city.y, 0.05]}><circleGeometry args={[i ? 0.035 : 0.06, 12]} /><meshBasicMaterial color="#d6d4aa" /></mesh>)}
    <group position={[0, 0, 0.08]}><Beacon size={distance * 0.025} /></group>
    <PlaceLabel text="PARIS · ORIGINE" scale={[distance * 0.1, distance * 0.0125, 1]} position={[0, distance * 0.07, 0.12]} />
    <mesh position={[0, 0, 0.06]}><ringGeometry args={[distance * 0.045, distance * 0.046, 96]} /><meshBasicMaterial color="#f9c888" transparent opacity={0.45} /></mesh>
  </>;
};

export const parisVector = () => {
  const phi = (P.geography.parisLon + 180) * Math.PI / 180;
  const theta = (90 - P.geography.parisLat) * Math.PI / 180;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
};

export const StarField: React.FC<{radius?: number}> = ({radius = 300}) => {
  const geometry = useMemo(() => {
    const r = rng(341); const coords: number[] = [];
    for (let i = 0; i < 1500; i++) {const a = r() * Math.PI * 2; const z = r() * 2 - 1; const s = Math.sqrt(1 - z * z); coords.push(Math.cos(a) * s * radius, z * radius, Math.sin(a) * s * radius);}
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
  }, [radius]);
  return <points geometry={geometry}><pointsMaterial color="#cfddf9" size={1.1} sizeAttenuation={false} transparent opacity={0.7} depthWrite={false} /></points>;
};

export const Planet: React.FC<{from: number}> = ({from}) => {
  const t = from + useCurrentFrame() / P.fps;
  const k = smooth(from, from + P.zoom.planetDuration, t);
  const maps = usePlanetTextures(EARTH_TEXTURES);
  const orientation = useMemo(() => new THREE.Quaternion().setFromUnitVectors(parisVector(), new THREE.Vector3(0, 0, 1)), []);
  const spin = smooth(from + 2, from + P.zoom.planetDuration, t) * 0.45;
  const distance = 1.75 * Math.pow(7.7, k);
  const spot = parisVector().multiplyScalar(1.015).applyQuaternion(orientation).applyAxisAngle(new THREE.Vector3(0, 1, 0), spin);
  const moonAngle = (t - from) * 0.12 + 0.3;
  const moon = new THREE.Vector3(Math.cos(moonAngle) * P.solar.moonOrbit * 0.7, Math.sin(moonAngle) * P.solar.moonOrbit * 0.7, -0.4);
  if (!maps) return null;
  return <>
    <color attach="background" args={['#040916']} />
    <CameraRig position={[0, 0, distance]} target={[0, 0, 0]} fov={42} />
    <StarField />
    <ambientLight intensity={0.6} />
    <directionalLight position={[-3, 3, 5]} intensity={1.9} color="#e1ecff" />
    <group rotation={[0, spin, 0]}>
      <group quaternion={orientation}>
        <mesh><sphereGeometry args={[1, 96, 64]} /><meshPhongMaterial map={maps.earth} shininess={14} specular="#627e8b" /></mesh>
        <group rotation={[0, k * 0.09, 0]}><PlanetAir clouds /></group>
        <PlanetAir />
      </group>
    </group>
    <group position={spot}><Beacon size={0.022 + k * 0.025} /></group>
    <PlaceLabel text="PARIS" scale={[distance * 0.07, distance * 0.00875, 1]} position={[spot.x, spot.y + distance * 0.03, spot.z + 0.01]} />
    <mesh position={moon} scale={P.solar.moonRadius * smooth(0.1, 0.3, k)}><sphereGeometry args={[1, 40, 32]} /><meshPhongMaterial map={maps.moon} shininess={1} /></mesh>
    {k > 0.3 && <PlaceLabel text="LUNE" scale={[distance * 0.06, distance * 0.0075, 1]} position={[moon.x, moon.y + distance * 0.025, moon.z]} />}
  </>;
};

export const Galaxy: React.FC<{from: number}> = ({from}) => {
  const t = from + useCurrentFrame() / P.fps;
  const k = smooth(from, from + P.zoom.galaxyDuration, t);
  const glow = useGlowTexture();
  const starsTexture = useMemo(() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const ctx = cv.getContext('2d')!;
    const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  }, []);
  const geometry = useMemo(() => {
    const r = rng(350); const coords: number[] = []; const colors: number[] = [];
    for (let i = 0; i < 28000; i++) {
      const radius = i > 24000 ? Math.pow(r(), 2) * 8 : Math.pow(r(), 0.65) * 42; const arm = i % 4;
      const angle = arm * Math.PI / 2 + Math.log(1 + radius) * 1.35 + (r() - 0.5) * (0.12 + radius * 0.015);
      coords.push(Math.cos(angle) * radius + (r() - 0.5) * 1.7, (r() - 0.5) * (1.4 + 6 * Math.exp(-radius / 8)), Math.sin(angle) * radius + (r() - 0.5) * 1.7);
      const c = new THREE.Color('#a8c9ff').lerp(new THREE.Color('#ffe1ae'), Math.exp(-radius / 14)).multiplyScalar(0.6 + r() * 0.8);
      colors.push(c.r, c.g, c.b);
    }
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(coords, 3)).setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }, []);
  // Repère schématique du système solaire sur un bras, point de départ du recul.
  const solarAngle = Math.log(27) * 1.35 + Math.PI / 2;
  const sun = new THREE.Vector3(Math.cos(solarAngle) * 26, 0, Math.sin(solarAngle) * 26);
  const angle = 0.08 + k * 0.35;
  const orbit = new THREE.Vector3(Math.sin(angle) * (8 + k * 46), 5 + k * 160, 9 + k * 145);
  const target = sun.clone().multiplyScalar(1 - k);
  const position = target.clone().add(orbit);
  return <>
    <color attach="background" args={['#030610']} />
    <CameraRig position={position.toArray() as [number, number, number]} target={target.toArray() as [number, number, number]} fov={48} />
    <StarField radius={500} />
    <points geometry={geometry}><pointsMaterial vertexColors map={starsTexture} transparent opacity={0.07} size={2.1} depthWrite={false} blending={THREE.AdditiveBlending} /></points>
    <points geometry={geometry}><pointsMaterial vertexColors map={starsTexture} transparent opacity={0.9} size={0.36} depthWrite={false} blending={THREE.AdditiveBlending} /></points>
    <sprite scale={[22, 22, 1]}><spriteMaterial map={glow} color="#ffdc9f" transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
    <group position={sun}><Beacon size={0.15 + k * 0.75} /></group>
    <PlaceLabel text="NOUS SOMMES ICI" scale={[5 + k * 15, 0.625 + k * 1.875, 1]} position={[sun.x, sun.y + 1 + k * 3, sun.z]} />
    <mesh position={sun} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.2, 1.24, 64]} /><meshBasicMaterial color="#ffd997" transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>
  </>;
};
