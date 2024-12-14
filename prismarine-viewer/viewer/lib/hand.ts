import * as THREE from 'three'
import { loadSkinToCanvas } from 'skinview-utils'
import stevePng from 'mc-assets/dist/other-textures/latest/entity/player/wide/steve.png'

let steveTexture: THREE.Texture
export const getMyHand = async (image?: string) => {
  let newMap: THREE.Texture
  if (!image && steveTexture) {
    newMap = steveTexture
  } else {
    image ??= stevePng
    const skinCanvas = document.createElement('canvas')
    const img = new Image()
    img.src = image
    await new Promise<void>(resolve => {
      img.onload = () => {
        resolve()
      }
    })
    loadSkinToCanvas(skinCanvas, img)
    newMap = new THREE.CanvasTexture(skinCanvas)
    // newMap.flipY = false
    newMap.magFilter = THREE.NearestFilter
    newMap.minFilter = THREE.NearestFilter
    if (!image) {
      steveTexture = newMap
    }
  }

  // right arm
  const box = new THREE.BoxGeometry()
  const material = new THREE.MeshStandardMaterial()
  const slim = false
  const mesh = new THREE.Mesh(box, material)
  mesh.scale.x = slim ? 3 : 4
  mesh.scale.y = 12
  mesh.scale.z = 4
  setSkinUVs(box, 40, 16, slim ? 3 : 4, 12, 4)
  material.map = newMap
  material.needsUpdate = true
  const group = new THREE.Group()
  group.add(mesh)
  group.scale.set(0.1, 0.1, 0.1)
  mesh.rotation.z = Math.PI
  return group
}

function setUVs (
  box: THREE.BoxGeometry,
  u: number,
  v: number,
  width: number,
  height: number,
  depth: number,
  textureWidth: number,
  textureHeight: number
): void {
  const toFaceVertices = (x1: number, y1: number, x2: number, y2: number) => [
    new THREE.Vector2(x1 / textureWidth, 1 - y2 / textureHeight),
    new THREE.Vector2(x2 / textureWidth, 1 - y2 / textureHeight),
    new THREE.Vector2(x2 / textureWidth, 1 - y1 / textureHeight),
    new THREE.Vector2(x1 / textureWidth, 1 - y1 / textureHeight),
  ]

  const top = toFaceVertices(u + depth, v, u + width + depth, v + depth)
  const bottom = toFaceVertices(u + width + depth, v, u + width * 2 + depth, v + depth)
  const left = toFaceVertices(u, v + depth, u + depth, v + depth + height)
  const front = toFaceVertices(u + depth, v + depth, u + width + depth, v + depth + height)
  const right = toFaceVertices(u + width + depth, v + depth, u + width + depth * 2, v + height + depth)
  const back = toFaceVertices(u + width + depth * 2, v + depth, u + width * 2 + depth * 2, v + height + depth)

  const uvAttr = box.attributes.uv as THREE.BufferAttribute
  const uvRight = [right[3], right[2], right[0], right[1]]
  const uvLeft = [left[3], left[2], left[0], left[1]]
  const uvTop = [top[3], top[2], top[0], top[1]]
  const uvBottom = [bottom[0], bottom[1], bottom[3], bottom[2]]
  const uvFront = [front[3], front[2], front[0], front[1]]
  const uvBack = [back[3], back[2], back[0], back[1]]

  // Create a new array to hold the modified UV data
  const newUVData = [] as number[]

  // Iterate over the arrays and copy the data to uvData
  for (const uvArray of [uvRight, uvLeft, uvTop, uvBottom, uvFront, uvBack]) {
    for (const uv of uvArray) {
      newUVData.push(uv.x, uv.y)
    }
  }

  uvAttr.set(new Float32Array(newUVData))
  uvAttr.needsUpdate = true
}

function setSkinUVs (box: THREE.BoxGeometry, u: number, v: number, width: number, height: number, depth: number): void {
  setUVs(box, u, v, width, height, depth, 64, 64)
}
