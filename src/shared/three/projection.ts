import * as THREE from 'three';

type V3 = [number, number, number];
type Vec = THREE.Vector3 | V3;
export type CameraView = {pos: Vec; target: Vec; fov: number; up?: Vec};

const vec = (v: Vec) => (Array.isArray(v) ? new THREE.Vector3(...v) : v.clone());
const camera = new THREE.PerspectiveCamera();

/**
 * Screen position (pixels) of a world point for a camera set up like the scenes' Rig
 * (position, up, lookAt, vertical fov). Lets HTML overlays follow 3D characters.
 */
export const projectToScreen = (view: CameraView, point: Vec, width: number, height: number) => {
  camera.fov = view.fov;
  camera.aspect = width / height;
  camera.near = 0.01;
  camera.far = 10000;
  camera.position.copy(vec(view.pos));
  camera.up.copy(view.up ? vec(view.up) : new THREE.Vector3(0, 1, 0));
  camera.lookAt(vec(view.target));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const p = vec(point).project(camera);
  return {
    x: ((p.x + 1) / 2) * width,
    y: ((1 - p.y) / 2) * height,
    /** In front of the camera and inside the frame (with a small margin). */
    visible: p.z > -1 && p.z < 1 && Math.abs(p.x) <= 1.1 && Math.abs(p.y) <= 1.1,
  };
};
