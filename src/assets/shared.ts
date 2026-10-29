import {BOX, BOX_UP, CYL, PRISM, MANSARD} from './kit';
import * as THREE from 'three';

export {BOX, BOX_UP, CYL, PRISM, MANSARD};

export const PANE = new THREE.PlaneGeometry(1, 1);
export const ICO = new THREE.IcosahedronGeometry(1, 0);
export const CONE = new THREE.ConeGeometry(0.5, 1, 5).translate(0, 0.5, 0);
export const WHEEL = new THREE.CylinderGeometry(0.5, 0.5, 1, 8).rotateZ(Math.PI / 2);
export const OCTA = new THREE.OctahedronGeometry(1, 0);
