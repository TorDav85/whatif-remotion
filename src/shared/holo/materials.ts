/**
 * Materials of the holo style. Additive, no depth write: overlapping lines add up into a glow on the
 * black background (a cheap "bloom" without post-processing). Uniforms are set from the frame time
 * by the components, never from a clock.
 */
import {useEffect, useMemo} from 'react';
import * as THREE from 'three';

const additive = {transparent: true, depthWrite: false, blending: THREE.AdditiveBlending} as const;

/** Disposes a material/geometry/texture when the component unmounts or the value changes. */
export const useDispose = <T extends {dispose: () => void}>(value: T) => {
  useEffect(() => () => value.dispose(), [value]);
  return value;
};

export const useWireMaterial = (color: string, opacity = 1) => {
  const m = useMemo(() => new THREE.LineBasicMaterial({...additive, color, opacity}), []);
  m.color.set(color);
  m.opacity = opacity;
  return useDispose(m);
};

/** Translucent X-ray body: bright at grazing angles (fresnel), almost clear face-on. */
export const useXrayMaterial = (color: string, opacity = 0.35) => {
  const m = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...additive,
        side: THREE.DoubleSide,
        uniforms: {uColor: {value: new THREE.Color(color)}, uOpacity: {value: opacity}},
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vV;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uOpacity;
          varying vec3 vN; varying vec3 vV;
          void main() {
            float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
            gl_FragColor = vec4(uColor * uOpacity * (0.18 + 0.82 * f), 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  (m.uniforms.uColor.value as THREE.Color).set(color);
  m.uniforms.uOpacity.value = opacity;
  return useDispose(m);
};

/**
 * Glowing tube with travelling bands (the "dash offset" of current): `uv.x` runs along the tube.
 * `head` (0..1) lights the tube only up to that point, for a current that advances.
 */
export const usePulseMaterial = () =>
  useDispose(
    useMemo(
      () =>
        new THREE.ShaderMaterial({
          ...additive,
          uniforms: {
            uColor: {value: new THREE.Color('#00f0ff')},
            uTime: {value: 0},
            uCount: {value: 8},
            uSpeed: {value: 0.15},
            uWidth: {value: 0.22},
            uBase: {value: 0.25},
            uIntensity: {value: 1},
            uHead: {value: 1},
            uTail: {value: 0},
          },
          vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor; uniform float uTime, uCount, uSpeed, uWidth, uBase, uIntensity, uHead, uTail;
            varying vec2 vUv;
            void main() {
              float d = fract(vUv.x * uCount - uTime * uSpeed * uCount);
              float pulse = clamp(1.0 - abs(d - uWidth * 0.5) / (uWidth * 0.5), 0.0, 1.0);
              float lit = step(uTail, vUv.x) * (1.0 - smoothstep(uHead - 0.01, uHead, vUv.x));
              float k = (uBase + (1.0 - uBase) * pulse * pulse) * uIntensity * lit;
              gl_FragColor = vec4(uColor * k, 1.0);
              #include <colorspace_fragment>
            }`,
        }),
      [],
    ),
  );

/** Ground lines fading out with distance from `center` (perspective grid that melts into the dark). */
export const useGridMaterial = () =>
  useDispose(
    useMemo(
      () =>
        new THREE.ShaderMaterial({
          ...additive,
          uniforms: {
            uColor: {value: new THREE.Color('#003344')},
            uCenter: {value: new THREE.Vector2(0, 0)},
            uNear: {value: 10},
            uFar: {value: 80},
            uOpacity: {value: 1},
          },
          vertexShader: /* glsl */ `
            varying vec3 vW;
            void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor; uniform vec2 uCenter; uniform float uNear, uFar, uOpacity;
            varying vec3 vW;
            void main() {
              float a = uOpacity * (1.0 - smoothstep(uNear, uFar, distance(vW.xz, uCenter)));
              gl_FragColor = vec4(uColor * a, 1.0);
              #include <colorspace_fragment>
            }`,
        }),
      [],
    ),
  );

/** Concentric pulsed rings on the ground (radar wave), drawn by a shader on a flat disc. */
export const useRingsMaterial = () =>
  useDispose(
    useMemo(
      () =>
        new THREE.ShaderMaterial({
          ...additive,
          side: THREE.DoubleSide,
          uniforms: {
            uColor: {value: new THREE.Color('#00f0ff')},
            uAge: {value: 0},
            uSpeed: {value: 6},
            uSpacing: {value: 2.5},
            uCount: {value: 3},
            uLife: {value: 4},
            uRadius: {value: 30},
            uIntensity: {value: 1},
          },
          vertexShader: /* glsl */ `
            varying vec2 vP;
            void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor; uniform float uAge, uSpeed, uSpacing, uCount, uLife, uRadius, uIntensity;
            varying vec2 vP;
            void main() {
              float r = length(vP);
              float k = 0.0;
              for (int i = 0; i < 6; i++) {
                if (float(i) >= uCount) break;
                float age = uAge - float(i) * uSpacing / uSpeed;
                if (age < 0.0 || age > uLife) continue;
                float ring = age * uSpeed;
                float fade = 1.0 - age / uLife;
                k += fade * (exp(-abs(r - ring) * 7.0) + 0.25 * exp(-abs(r - ring) * 1.2) * step(r, ring));
              }
              k *= 1.0 - smoothstep(uRadius * 0.7, uRadius, r);
              gl_FragColor = vec4(uColor * k * uIntensity, 1.0);
              #include <colorspace_fragment>
            }`,
        }),
      [],
    ),
  );

/** White radial sprite texture (tinted by the sprite colour) for halos and contact sparks. */
export const useGlowTexture = () =>
  useDispose(
    useMemo(() => {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d')!;
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.2, 'rgba(255,255,255,0.55)');
      gr.addColorStop(0.55, 'rgba(255,255,255,0.12)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }, []),
  );

export {additive as ADDITIVE};
