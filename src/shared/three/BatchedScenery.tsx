import React, {useLayoutEffect, useRef} from 'react';
import * as THREE from 'three';

/** Keep the library's editable assets while batching repeated shapes for video rendering. */
export const BatchedScenery:React.FC<{children:React.ReactNode}>=({children})=>{
  const source=useRef<THREE.Group>(null),output=useRef<THREE.Group>(null);
  useLayoutEffect(()=>{
    const src=source.current!,dst=output.current!;
    src.updateWorldMatrix(true,true);
    const inverse=src.matrixWorld.clone().invert();
    const batches=new Map<string,{geometry:THREE.BufferGeometry;material:THREE.Material;matrices:THREE.Matrix4[]}>();
    src.traverse(object=>{
      if(!(object instanceof THREE.Mesh)||object instanceof THREE.InstancedMesh||Array.isArray(object.material))return;
      const material=object.material as THREE.MeshStandardMaterial;
      const geometry=object.geometry;
      const shape=geometry as THREE.BufferGeometry&{parameters?:unknown};
      const key=JSON.stringify([geometry.type,shape.parameters??geometry.uuid,material.type,material.color?.getHex(),material.emissive?.getHex(),material.emissiveIntensity,material.roughness,material.metalness,material.opacity,material.transparent,material.side,material.flatShading]);
      if(!batches.has(key))batches.set(key,{geometry,material,matrices:[]});
      batches.get(key)!.matrices.push(inverse.clone().multiply(object.matrixWorld));
    });
    const meshes:THREE.InstancedMesh[]=[];
    batches.forEach(({geometry,material,matrices})=>{
      const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);
      matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
      mesh.instanceMatrix.needsUpdate=true;
      mesh.computeBoundingSphere();dst.add(mesh);meshes.push(mesh);
    });
    src.visible=false;
    return ()=>{meshes.forEach(mesh=>{dst.remove(mesh);mesh.dispose();});};
  },[children]);
  return <><group ref={source}>{children}</group><group ref={output}/></>;
};
