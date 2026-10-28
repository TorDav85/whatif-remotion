import React, {useEffect, useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {rng, smooth} from '../../core/animation';
import P from './scenario.json';

/** Adaptation originale du langage visuel de la référence : aplats, contours et palette marine. */
export const ToonWorld: React.FC = () => {
  const {scene, size} = useThree();
  const state = useMemo(() => {
    const gradient = new THREE.DataTexture(new Uint8Array([70, 155, 225, 255]), 4, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
    const outline = new THREE.ShaderMaterial({
      uniforms: {resolution: {value: new THREE.Vector2()}, ink: {value: new THREE.Color('#153d48')}, widthPx: {value: 1.25}},
      side: THREE.BackSide, depthWrite: false,
      vertexShader: `uniform vec2 resolution; uniform float widthPx;
        void main(){vec4 p=vec4(position,1.0); vec3 n=normal;
        #ifdef USE_INSTANCING
          p=instanceMatrix*p; n=mat3(instanceMatrix)*n;
        #endif
        vec4 clip=projectionMatrix*modelViewMatrix*p;
        vec3 vn=normalize(normalMatrix*n);
        vec2 dir=normalize((projectionMatrix*vec4(vn,0.0)).xy+vec2(0.00001));
        clip.xy+=dir*widthPx*2.0/resolution*clip.w;
        gl_Position=clip;}`,
      fragmentShader: `uniform vec3 ink; void main(){gl_FragColor=vec4(ink,1.0);
        #include <colorspace_fragment>
      }`,
    });
    return {gradient, outline, materials: new Map<THREE.Material, {source: THREE.MeshStandardMaterial; toon: THREE.MeshToonMaterial}>(), lines: new Map<THREE.Mesh, THREE.Mesh>()};
  }, []);
  useLayoutEffect(() => {
    state.outline.uniforms.resolution.value.set(size.width, size.height);
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || mesh.userData.v4Outline || Array.isArray(mesh.material)) return;
      let record = state.materials.get(mesh.material);
      if (!record && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        const source = mesh.material as THREE.MeshStandardMaterial;
        const toon = new THREE.MeshToonMaterial({gradientMap: state.gradient, color: source.color, map: source.map, side: source.side, vertexColors: source.vertexColors});
        record = {source, toon};
        state.materials.set(source, record); state.materials.set(toon, record);
      }
      if (!record) return;
      const {source, toon} = record;
      toon.color.copy(source.color); toon.emissive.copy(source.emissive); toon.emissiveIntensity = source.emissiveIntensity;
      mesh.material = toon;
      if (!state.lines.has(mesh) && !source.transparent) {
        let line: THREE.Mesh;
        if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
          const original = mesh as THREE.InstancedMesh;
          const inst = new THREE.InstancedMesh(original.geometry, state.outline, original.count);
          inst.instanceMatrix = original.instanceMatrix; inst.count = original.count;
          line = inst;
        } else line = new THREE.Mesh(mesh.geometry, state.outline);
        line.userData.v4Outline = true; line.frustumCulled = false;
        mesh.add(line); state.lines.set(mesh, line);
      }
    });
  });
  useEffect(() => () => {
    state.lines.forEach((line, parent) => parent.remove(line));
    new Set([...state.materials.values()].map((r) => r.toon)).forEach((m) => m.dispose());
    state.gradient.dispose(); state.outline.dispose();
  }, [state]);
  return null;
};

/** Écume cellulaire et aplats mouvants, animés uniquement par la frame Remotion. */
export const FoamWater: React.FC<{t: number; xy?: boolean; density?: number}> = ({t, xy = false, density = 0.09}) => {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {time: {value: 0}, density: {value: density}, useXY: {value: xy ? 1 : 0}},
    vertexShader: `varying vec3 vW; void main(){vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform float time; uniform float density; uniform float useXY; varying vec3 vW;
      vec2 hash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
      vec2 cells(vec2 p){vec2 g=floor(p), f=fract(p); float a=10.0,b=10.0;
        for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 o=vec2(float(x),float(y)); vec2 h=hash(g+o); vec2 q=o+0.5+0.35*sin(h*6.2831+time*0.35)-f;
          float d=dot(q,q); if(d<a){b=a;a=d;}else if(d<b){b=d;}}}return vec2(a,b);}
      void main(){vec2 p=mix(vW.xz,vW.xy,useXY)*density+vec2(time*0.045,-time*0.025);
        p+=vec2(sin(p.y*0.8+time*0.3),cos(p.x*0.7-time*0.2))*0.35;
        p+=vec2(sin(p.y*2.5+sin(p.x*1.4)),cos(p.x*2.1-sin(p.y*1.7)))*0.18;
        vec2 d=cells(p); float edge=d.y-d.x; float foam=1.0-smoothstep(0.025,0.07,edge);
        float patchTone=step(0.28,d.x); vec3 blue=mix(vec3(0.025,0.22,0.52),vec3(0.045,0.39,0.68),patchTone);
        vec3 color=mix(blue,vec3(0.83,0.97,0.95),foam*0.95);
        gl_FragColor=vec4(color,1.0);
        #include <colorspace_fragment>
      }`,
  }), [density, xy]);
  material.uniforms.time.value = t;
  return <primitive object={material} attach="material" />;
};

export const SkyClouds: React.FC<{t: number}> = ({t}) => {
  const clouds = useMemo(() => {
    const r = rng(410);
    return Array.from({length: 16}, (_, i) => ({x: -1100 + i * 145, y: 100 + r() * 130, z: -650 - r() * 350, s: 35 + r() * 25, ph: r() * 6}));
  }, []);
  return <group>
    {clouds.map((c, i) => <group key={i} position={[c.x + Math.sin(t * 0.025 + c.ph) * 25, c.y, c.z]} scale={c.s}>
      <mesh position={[0, -0.12, 0]} scale={[2.1, 0.44, 0.65]}><sphereGeometry args={[1, 16, 10]} /><meshBasicMaterial color="#e8faf3" toneMapped={false} fog={false} /></mesh>
      {[-1, 0, 1].map((k) => <mesh key={k} position={[k * 0.9, k === 0 ? 0.28 : 0, -0.1]} scale={[1.05, k === 0 ? 0.8 : 0.58, 0.65]}><sphereGeometry args={[1, 16, 10]} /><meshBasicMaterial color="#fffdf5" toneMapped={false} fog={false} /></mesh>)}
    </group>)}
  </group>;
};

export const WindStreaks: React.FC<{t: number}> = ({t}) => {
  const lines = useMemo(() => {
    const r = rng(411);
    return Array.from({length: 18}, () => {
      const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3));
      const object = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: '#e8ffe4', transparent: true, opacity: 0.4, depthWrite: false}));
      object.frustumCulled = false;
      return {object, phase: r(), angle: r() * 6.28, radius: 20 + r() * 45};
    });
  }, []);
  useLayoutEffect(() => {
    const pull = smooth(P.effects.pullFrom, P.effects.absorbTo, t);
    for (const line of lines) {
      const head = (t * 0.18 + line.phase) % 1;
      const attribute = line.object.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let j = 0; j < 40; j++) {
        const u = Math.max(0, head - 0.15 + j / 39 * 0.15);
        const a = line.angle + u * (1.5 + pull * 5);
        const radius = line.radius * (1 - u * pull);
        attribute.setXYZ(j, Math.cos(a) * radius, 2 + Math.sin(u * Math.PI) * 6 + u * P.hole.height * pull, P.hole.z + Math.sin(a) * radius);
      }
      attribute.needsUpdate = true;
      line.object.material.opacity = Math.sin(head * Math.PI) * (0.25 + pull * 0.45) * (1 - smooth(27, 33, t));
    }
  });
  useEffect(() => () => lines.forEach((l) => {l.object.geometry.dispose(); l.object.material.dispose();}), [lines]);
  return <group>{lines.map((l, i) => <primitive key={i} object={l.object} />)}</group>;
};
