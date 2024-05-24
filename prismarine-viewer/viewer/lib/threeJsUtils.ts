import * as THREE from 'three';

export const disposeObject = (obj: THREE.Object3D) => {
  if (!obj) return
  // not cleaning texture there as it might be used by other objects, but would be good to also do that
  if (obj instanceof THREE.Mesh) {
    obj.geometry.dispose();
    obj.material.dispose();
  }
  if (obj.children) {
    obj.children.forEach(disposeObject);
  }
}
