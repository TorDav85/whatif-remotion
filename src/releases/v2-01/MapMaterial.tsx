import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useRelease201} from './context';

/** Stylised geographical surface: continuous variation, never a repeated image tile. */
export const MapMaterial201: React.FC<{color: THREE.ColorRepresentation; water?: boolean; time?: number; fallback?: React.ReactNode}> = ({color, water = false, time = 0, fallback}) => {
  const enabled = useRelease201();
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {base: {value: new THREE.Color()}, time: {value: 0}},
    vertexShader: 'varying vec2 vP; void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `
      uniform vec3 base; uniform float time; varying vec2 vP;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      float fbm(vec2 p){return .55*noise(p)+.28*noise(p*2.03)+.12*noise(p*4.11)+.05*noise(p*8.3);}
      void main(){
        ${water ? `
          float n=fbm(vP*.65+vec2(time*.012,-time*.008));
          float waves=sin(vP.x*3.0+vP.y*.8+sin(vP.y*1.7)+time*.16)*.025;
          vec3 c=base*(.88+.2*n+waves);
        ` : `
          float n=fbm(vP*12.0+vec2(fbm(vP*2.0),fbm(vP*2.0+4.0))*2.0);
          vec3 c=base*(.79+.28*n);
          c=mix(c,base*.7,smoothstep(.56,.78,n)*.3);
          float city=exp(-dot(vP*8.0,vP*8.0));
          float grain=noise(vP*170.0);
          c=mix(c,vec3(.32,.35,.33)*(.9+.22*grain),city*.48);
        `}
        gl_FragColor=vec4(c,1.0);
        #include <colorspace_fragment>
      }`,
  }), [water]);
  material.uniforms.base.value.set(color);
  material.uniforms.time.value = time;
  if (!enabled) return <>{fallback ?? <meshBasicMaterial color={color} />}</>;
  return <primitive attach="material" object={material} />;
};

export const RoadMaterial201: React.FC<{opacity: number; fallback: React.ReactNode}> = ({opacity, fallback}) => {
  const enabled = useRelease201();
  if (!enabled) return <>{fallback}</>;
  return <meshStandardMaterial color="#506879" metalness={0.25} roughness={0.34} transparent opacity={opacity} />;
};
