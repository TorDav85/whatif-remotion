import React, {useMemo} from 'react';
import * as THREE from 'three';

export const SkyDome: React.FC<{top: THREE.Color; bottom: THREE.Color}> = ({top, bottom}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {top: {value: new THREE.Color()}, bottom: {value: new THREE.Color()}},
        vertexShader: `varying vec3 vP;
          void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
          void main(){ float h = smoothstep(-0.05, 0.55, vP.y);
            gl_FragColor = vec4(mix(bottom, top, h), 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  mat.uniforms.top.value.copy(top);
  mat.uniforms.bottom.value.copy(bottom);
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[600, 24, 16]} />
    </mesh>
  );
};
