import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {BOX, Mat} from './kit';

type V3 = [number, number, number];
export type DetailBlock = {p: V3; s: V3; r?: V3};

/** Détails d'une même matière regroupés en un appel de dessin. Unités : mètres. */
export const DetailBlocks: React.FC<{blocks: DetailBlock[]; color: string; metal?: boolean}> = ({blocks, color, metal}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const matrices = useMemo(() => {
    const object = new THREE.Object3D();
    return blocks.map(({p, s, r}) => {
      object.position.set(...p);
      object.scale.set(...s);
      object.rotation.set(...(r ?? [0, 0, 0]));
      object.updateMatrix();
      return object.matrix.clone();
    });
  }, [blocks]);
  useLayoutEffect(() => {
    if (!ref.current) return;
    matrices.forEach((matrix, i) => ref.current!.setMatrixAt(i, matrix));
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [matrices]);
  if (!blocks.length) return null;
  return (
    <instancedMesh key={blocks.length} ref={ref} args={[BOX, undefined, blocks.length]}>
      <Mat color={color} metal={metal} />
    </instancedMesh>
  );
};
