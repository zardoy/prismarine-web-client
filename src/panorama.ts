//@ts-check

import { join } from 'path'
import fs from 'fs'
import { subscribeKey } from 'valtio/utils'
import Entity from 'prismarine-viewer/viewer/lib/entity/Entity'
import { fromTexturePackPath, resourcePackState } from './texturePack'
import { options, watchValue } from './optionsStorage'
import { miscUiState } from './globalState'

let panoramaCubeMap
let shouldDisplayPanorama = false
let panoramaUsesResourcePack = null as boolean | null

const panoramaFiles = [
  'panorama_1.png', // WS
  'panorama_3.png', // ES
  'panorama_4.png', // Up
  'panorama_5.png', // Down
  'panorama_0.png', // NS
  'panorama_2.png' // SS
]

const panoramaResourcePackPath = 'assets/minecraft/textures/gui/title/background'
const possiblyLoadPanoramaFromResourcePack = async (file) => {
  let base64Texture
  if (panoramaUsesResourcePack) {
    try {
      base64Texture = await fs.promises.readFile(fromTexturePackPath(join(panoramaResourcePackPath, file)), 'base64')
    } catch (err) {
      panoramaUsesResourcePack = false
    }
  }
  if (base64Texture) return `data:image/png;base64,${base64Texture}`
  else return join('extra-textures/background', file)
}

const updateResourcePackSupportPanorama = async () => {
  try {
    await fs.promises.readFile(fromTexturePackPath(join(panoramaResourcePackPath, panoramaFiles[0])), 'base64')
    panoramaUsesResourcePack = true
  } catch (err) {
    panoramaUsesResourcePack = false
  }
}

watchValue(miscUiState, m => {
  if (m.appLoaded) {
    // Also adds panorama on app load here
    watchValue(resourcePackState, async (s) => {
      const oldState = panoramaUsesResourcePack
      const newState = s.resourcePackInstalled && (await updateResourcePackSupportPanorama(), panoramaUsesResourcePack)
      if (newState === oldState) return
      removePanorama()
      void addPanoramaCubeMap()
    })
  }
})

subscribeKey(miscUiState, 'loadedDataVersion', () => {
  if (miscUiState.loadedDataVersion) removePanorama()
  else void addPanoramaCubeMap()
})

// Menu panorama background
// TODO-low use abort controller
export async function addPanoramaCubeMap () {
  if (panoramaCubeMap || miscUiState.loadedDataVersion || options.disableAssets) return
  shouldDisplayPanorama = true

  let time = 0
  viewer.camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.05, 1000)
  viewer.camera.updateProjectionMatrix()
  viewer.camera.position.set(0, 0, 0)
  viewer.camera.rotation.set(0, 0, 0)
  const panorGeo = new THREE.BoxGeometry(1000, 1000, 1000)

  const loader = new THREE.TextureLoader()
  const panorMaterials = [] as THREE.MeshBasicMaterial[]
  await updateResourcePackSupportPanorama()
  for (const file of panoramaFiles) {
    panorMaterials.push(new THREE.MeshBasicMaterial({
      map: loader.load(await possiblyLoadPanoramaFromResourcePack(file)),
      transparent: true,
      side: THREE.DoubleSide
    }))
  }

  if (!shouldDisplayPanorama) return

  const panoramaBox = new THREE.Mesh(panorGeo, panorMaterials)

  panoramaBox.onBeforeRender = () => {
    time += 0.01
    panoramaBox.rotation.y = Math.PI + time * 0.01
    panoramaBox.rotation.z = Math.sin(-time * 0.001) * 0.001
  }

  const group = new THREE.Object3D()
  group.add(panoramaBox)

  // should be rewritten entirely
  for (let i = 0; i < 20; i++) {
    const m = new Entity('1.16.4', 'squid').mesh!
    m.position.set(Math.random() * 30 - 15, Math.random() * 20 - 10, Math.random() * 10 - 17)
    m.rotation.set(0, Math.PI + Math.random(), -Math.PI / 4, 'ZYX')
    const v = Math.random() * 0.01
    m.children[0].onBeforeRender = () => {
      m.rotation.y += v
      m.rotation.z = Math.cos(panoramaBox.rotation.y * 3) * Math.PI / 4 - Math.PI / 2
    }
    group.add(m)
  }

  viewer.scene.add(group)
  panoramaCubeMap = group
}

export function removePanorama () {
  shouldDisplayPanorama = false
  if (!panoramaCubeMap) return
  viewer.camera = new THREE.PerspectiveCamera(options.fov, window.innerWidth / window.innerHeight, 0.1, 1000)
  viewer.camera.updateProjectionMatrix()
  viewer.scene.remove(panoramaCubeMap)
  panoramaCubeMap = null
}
