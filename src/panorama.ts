//@ts-check

import { join } from 'path'
import fs from 'fs'
import * as THREE from 'three'
import { subscribeKey } from 'valtio/utils'
import { EntityMesh } from 'prismarine-viewer/viewer/lib/entity/EntityMesh'
import { WorldDataEmitter } from 'prismarine-viewer/viewer'
import { Vec3 } from 'vec3'
import { getSyncWorld } from 'prismarine-viewer/examples/shared'
import { fromTexturePackPath, resourcePackState } from './resourcePack'
import { options, watchValue } from './optionsStorage'
import { miscUiState } from './globalState'
import { loadMinecraftData, preloadAllMcData } from './mcDataHelpers'

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
      // TODO!
      // base64Texture = await fs.promises.readFile(fromTexturePackPath(join(panoramaResourcePackPath, file)), 'base64')
    } catch (err) {
      panoramaUsesResourcePack = false
    }
  }
  if (base64Texture) return `data:image/png;base64,${base64Texture}`
  else return join('background', file)
}

const updateResourcePackSupportPanorama = async () => {
  try {
    // TODO!
    // await fs.promises.readFile(fromTexturePackPath(join(panoramaResourcePackPath, panoramaFiles[0])), 'base64')
    // panoramaUsesResourcePack = true
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
  viewer.camera.fov = 85
  await updateResourcePackSupportPanorama()
  if (process.env.SINGLE_FILE_BUILD_MODE && !panoramaUsesResourcePack) {
    void initDemoWorld()
    return
  }

  shouldDisplayPanorama = true

  let time = 0
  viewer.camera.near = 0.05
  viewer.camera.updateProjectionMatrix()
  viewer.camera.position.set(0, 0, 0)
  viewer.camera.rotation.set(0, 0, 0)
  const panorGeo = new THREE.BoxGeometry(1000, 1000, 1000)

  const loader = new THREE.TextureLoader()
  const panorMaterials = [] as THREE.MeshBasicMaterial[]
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
    const m = new EntityMesh('1.16.4', 'squid').mesh!
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
  viewer.camera.fov = options.fov
  shouldDisplayPanorama = false
  if (!panoramaCubeMap) return
  viewer.camera.near = 0.1
  viewer.camera.updateProjectionMatrix()
  viewer.scene.remove(panoramaCubeMap)
  panoramaCubeMap = null
}

const initDemoWorld = async () => {
  const version = '1.21.1'
  preloadAllMcData()
  console.time('load mc-data')
  await loadMinecraftData(version)
  console.timeEnd('load mc-data')
  if (miscUiState.gameLoaded) return
  console.time('load scene')
  const world = getSyncWorld(version)
  const PrismarineBlock = require('prismarine-block')
  const Block = PrismarineBlock(version)
  const fullBlocks = loadedData.blocksArray.filter(block => {
    // if (block.name.includes('leaves')) return false
    if (/* !block.name.includes('wool') &&  */!block.name.includes('stained_glass')/*  && !block.name.includes('terracotta') */) return false
    const b = Block.fromStateId(block.defaultState, 0)
    if (b.shapes?.length !== 1) return false
    const shape = b.shapes[0]
    return shape[0] === 0 && shape[1] === 0 && shape[2] === 0 && shape[3] === 1 && shape[4] === 1 && shape[5] === 1
  })
  const Z = -15
  const sizeX = 100
  const sizeY = 100
  for (let x = -sizeX; x < sizeX; x++) {
    for (let y = -sizeY; y < sizeY; y++) {
      const block = fullBlocks[Math.floor(Math.random() * fullBlocks.length)]
      world.setBlockStateId(new Vec3(x, y, Z), block.defaultState)
    }
  }
  viewer.camera.updateProjectionMatrix()
  viewer.camera.position.set(0.5, sizeY / 2 + 0.5, 0.5)
  viewer.camera.rotation.set(0, 0, 0)
  const initPos = new Vec3(...viewer.camera.position.toArray())
  const worldView = new WorldDataEmitter(world, 2, initPos)
  // worldView.addWaitTime = 0
  await viewer.world.setVersion(version)
  viewer.connect(worldView)
  void worldView.init(initPos)
  await viewer.world.waitForChunksToRender()

  console.timeEnd('load scene')
}
