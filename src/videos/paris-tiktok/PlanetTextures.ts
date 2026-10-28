import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';

export const ALL_PLANET_TEXTURES = ['earth', 'jupiter', 'mars', 'mercury', 'moon', 'neptune', 'saturn', 'saturnring', 'sun', 'uranus', 'uranusring', 'venus'] as const;
export type PlanetTexture = (typeof ALL_PLANET_TEXTURES)[number];
export const EARTH_TEXTURES: readonly PlanetTexture[] = ['earth', 'moon'];

/** Attend les images locales avant de libérer la frame du rendu vidéo. */
export const usePlanetTextures = (keys: readonly PlanetTexture[]) => {
  const advance = useThree((state) => state.advance);
  const signature = keys.join(',');
  const [handle] = useState(() => delayRender(`Textures des planètes : ${signature}`));
  const [textures, setTextures] = useState<Partial<Record<PlanetTexture, THREE.Texture>> | null>(null);
  const cleared = useRef(false);
  useLayoutEffect(() => {
    if (textures && !cleared.current) {
      // ThreeCanvas rend manuellement : une arrivée asynchrone doit aussi redessiner la frame.
      advance(performance.now());
      cleared.current = true;
      continueRender(handle);
    }
  }, [textures, handle, advance]);
  useEffect(() => {
    let disposed = false;
    const loaded: THREE.Texture[] = [];
    const loader = new THREE.TextureLoader();
    Promise.all(keys.map(async (key) => {
      const texture = await loader.loadAsync(staticFile(`planet-simulation/${key}map.png`));
      texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
      loaded.push(texture);
      return [key, texture] as const;
    })).then((entries) => {if (!disposed) setTextures(Object.fromEntries(entries));})
      .catch((error) => {if (!disposed) cancelRender(error);});
    return () => {
      disposed = true;
      if (!cleared.current) {cleared.current = true; continueRender(handle);}
      loaded.forEach((texture) => texture.dispose());
    };
  }, [signature, handle]);
  return textures;
};
