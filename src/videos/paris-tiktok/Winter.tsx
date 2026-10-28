import React, {useEffect, useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {rng, smooth} from '../../core/animation';
import P from './scenario.json';

/** Original winter materials inspired by Whiteout's cold streets. */
export const WinterWorld: React.FC = () => {
  const {scene} = useThree();
  const visited = useMemo(() => new WeakSet<THREE.Material>(), []);
  useLayoutEffect(() => {
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat.isMeshStandardMaterial || visited.has(mat)) return;
      visited.add(mat); mat.roughness = Math.min(mat.roughness, 0.78);
      mat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 winterP; varying vec3 winterN;');
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
          vec4 wp=vec4(transformed,1.0);
          #ifdef USE_INSTANCING
            wp=instanceMatrix*wp;
          #endif
          winterP=(modelMatrix*wp).xyz;
          winterN=inverseTransformDirection(transformedNormal,viewMatrix);`);
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
          varying vec3 winterP; varying vec3 winterN;
          float winterNoise(vec3 p){return fract(sin(dot(floor(p),vec3(127.1,311.7,74.7)))*43758.5453);}`);
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          float grain=winterNoise(winterP*32.0);
          float drift=.5+.5*sin(winterP.x*.55+sin(winterP.z*.34))*cos(winterP.z*.41);
          diffuseColor.rgb*=0.91+grain*0.14;
          float snow=smoothstep(0.58,0.96,normalize(winterN).y)*(0.70+drift*0.25);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.66,0.74,0.79),snow);`);
      };
      mat.customProgramCacheKey = () => 'whiteout-v6-winter-2'; mat.needsUpdate = true;
    });
  });
  return null;
};

export const WetRoad: React.FC = () => {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: `varying vec3 wp; void main(){vec4 p=modelMatrix*vec4(position,1.);wp=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `varying vec3 wp;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){float n=hash(floor(wp.xz*13.));float wav=sin(wp.z*.11+sin(wp.x*2.1))*.5+.5;
        float across=mod(abs(wp.x)-25.5,34.);float edge=smoothstep(3.3,4.5,abs(across-4.5));
        float tire=exp(-pow((abs(across-4.5)-1.1)*2.3,2.));
        vec3 col=mix(vec3(.032,.047,.062),vec3(.07,.105,.13),wav*.45+n*.18);
        col=mix(col,vec3(.32,.39,.43),edge*(.55+.35*wav));col*=1.-tire*.35;
        float glint=pow(max(0.,sin(wp.z*.045+wp.x*.12)),18.)*pow(max(0.,sin(wp.x*1.1)),16.);
        col+=vec3(.18,.14,.09)*glint*.7;gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`,
  }), []);
  useEffect(() => () => material.dispose(), [material]);
  return <primitive object={material} attach="material" />;
};

export const ColdWater: React.FC<{t: number; xy?: boolean; density?: number}> = ({t, xy = false, density = .09}) => {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms:{time:{value:0},xy:{value:xy?1:0},density:{value:density}},
    vertexShader:`varying vec3 wp; void main(){vec4 p=modelMatrix*vec4(position,1.);wp=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`uniform float time,xy,density;varying vec3 wp;
      void main(){vec2 p=mix(wp.xz,wp.xy,xy)*density;
        float wave=sin(p.y*8.+sin(p.x*2.)+time*.7)*sin(p.x*13.-time*.2);
        vec3 c=mix(vec3(.027,.055,.08),vec3(.13,.23,.28),wave*.5+.5);
        float ice=smoothstep(.83,.99,sin(p.x*2.4+sin(p.y*3.))*cos(p.y*1.3));
        c=mix(c,vec3(.42,.55,.61),ice*.6);gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`,
  }), [density, xy]);
  material.uniforms.time.value=t;
  useEffect(() => () => material.dispose(), [material]);
  return <primitive object={material} attach="material" />;
};

/** Time-based snow; the vortex bends flakes toward the hole. */
export const Snowfall: React.FC<{t:number}> = ({t}) => {
  const {camera} = useThree();
  const particles = useMemo(() => {
    const r=rng(610);
    const seeds=Array.from({length:2200},()=>({x:r(),y:r(),z:r(),phase:r()*6.28}));
    const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(seeds.length*3),3));
    const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
    const ctx=canvas.getContext('2d')!;const g=ctx.createRadialGradient(16,16,0,16,16,16);
    g.addColorStop(0,'#ffffff');g.addColorStop(.25,'#ffffff');g.addColorStop(1,'#ffffff00');
    ctx.fillStyle=g;ctx.fillRect(0,0,32,32);
    return {seeds,geometry,map:new THREE.CanvasTexture(canvas)};
  },[]);
  useLayoutEffect(()=>{
    const pull=smooth(P.effects.pullFrom,P.effects.absorbTo,t);
    const attr=particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    particles.seeds.forEach((p,i)=>{
      const x=(p.x-.5)*230+Math.sin(t*.2+p.phase)*6;
      const y=((p.y*90-t*(2.4+p.z*2))%90+90)%90;
      const z=(p.z-.5)*220-40;
      const angle=t*.3*pull+Math.atan2(z-P.hole.z,x);
      const radius=Math.hypot(x,z-P.hole.z)*(1-pull*.18);
      const altitude=Math.min(120,Math.max(0,camera.position.y-80));
      attr.setXYZ(i,Math.cos(angle)*radius,y+altitude+Math.sin(t+p.phase)*pull*2,P.hole.z+Math.sin(angle)*radius);
    });attr.needsUpdate=true;
  });
  useEffect(()=>()=>{particles.geometry.dispose();particles.map.dispose();},[particles]);
  return <points geometry={particles.geometry}><pointsMaterial map={particles.map} color="#e7f4fc" size={.25} transparent opacity={.7*(1-smooth(20,27,t))} depthWrite={false} /></points>;
};
