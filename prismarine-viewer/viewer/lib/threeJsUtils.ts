import * as THREE from 'three'

export const disposeObject = (obj: THREE.Object3D) => {
  // not cleaning texture there as it might be used by other objects, but would be good to also do that
  if (obj instanceof THREE.Mesh) {
    obj.geometry?.dispose?.()
    obj.material?.dispose?.()
  }
  if (obj.children) {
    // eslint-disable-next-line unicorn/no-array-for-each
    obj.children.forEach(disposeObject)
  }
}
