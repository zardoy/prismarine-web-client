import _ from 'lodash'
import { WorldDataEmitter, Viewer, MapControls } from '../viewer'
import { Vec3 } from 'vec3'
import { Schematic } from 'prismarine-schematic'
import BlockLoader from 'prismarine-block'
import ChunkLoader from 'prismarine-chunk'
import WorldLoader from 'prismarine-world'
import * as THREE from 'three'
import { GUI } from 'lil-gui'
import { toMajor } from '../viewer/lib/version'
import { loadScript } from '../viewer/lib/utils'
import JSZip from 'jszip'
import { TWEEN_DURATION } from '../viewer/lib/entities'
import Entity from '../viewer/lib/entity/Entity'
// import * as Mathgl from 'math.gl'
import { findTextureInBlockStates } from '../../src/playerWindows'
import { initWeblRenderer } from './webglRenderer'

globalThis.THREE = THREE
//@ts-ignore
require('three/examples/js/controls/OrbitControls')

const gui = new GUI()

// initial values
const params = {
  skip: '',
  version: globalThis.includedVersions.sort((a, b) => {
    const s = (x) => {
      const parts = x.split('.')
      return +parts[0] + (+parts[1])
    }
    return s(a) - s(b)
  }).at(-1),
  block: '',
  metadata: 0,
  supportBlock: false,
  entity: '',
  removeEntity() {
    this.entity = ''
  },
  entityRotate: false,
  camera: '',
  playSound() { },
  blockIsomorphicRenderBundle() { }
}

const qs = new URLSearchParams(window.location.search)
qs.forEach((value, key) => {
  const parsed = value.match(/^-?\d+$/) ? parseInt(value) : value === 'true' ? true : value === 'false' ? false : value
  params[key] = parsed
})
const setQs = () => {
  const newQs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (!value || typeof value === 'function' || params.skip.includes(key)) continue
    //@ts-ignore
    newQs.set(key, value)
  }
  window.history.replaceState({}, '', `${window.location.pathname}?${newQs}`)
}

let ignoreResize = false

async function main() {
  let continuousRender = false

  const { version } = params
  // temporary solution until web worker is here, cache data for faster reloads
  const globalMcData = window['mcData']
  if (!globalMcData['version']) {
    const major = toMajor(version)
    const sessionKey = `mcData-${major}`
    if (sessionStorage[sessionKey]) {
      Object.assign(globalMcData, JSON.parse(sessionStorage[sessionKey]))
    } else {
      if (sessionStorage.length > 1) sessionStorage.clear()
      await loadScript(`./mc-data/${major}.js`)
      try {
        sessionStorage[sessionKey] = JSON.stringify(Object.fromEntries(Object.entries(globalMcData).filter(([ver]) => ver.startsWith(major))))
      } catch { }
    }
  }

  const mcData = require('minecraft-data')(version)
  window['loadedData'] = mcData

  gui.add(params, 'version', globalThis.includedVersions)
  gui.add(params, 'block', mcData.blocksArray.map(b => b.name).sort((a, b) => a.localeCompare(b)))
  const metadataGui = gui.add(params, 'metadata')
  gui.add(params, 'supportBlock')
  gui.add(params, 'entity', mcData.entitiesArray.map(b => b.name).sort((a, b) => a.localeCompare(b))).listen()
  gui.add(params, 'removeEntity')
  gui.add(params, 'entityRotate')
  gui.add(params, 'skip')
  gui.add(params, 'playSound')
  gui.add(params, 'blockIsomorphicRenderBundle')
  gui.open(false)
  let metadataFolder = gui.addFolder('metadata')
  // let entityRotationFolder = gui.addFolder('entity metadata')

  const Chunk = ChunkLoader(version)
  const Block = BlockLoader(version)
  // const data = await fetch('smallhouse1.schem').then(r => r.arrayBuffer())
  // const schem = await Schematic.read(Buffer.from(data), version)

  const viewDistance = 0
  const targetPos = new Vec3(2, 90, 2)

  const World = WorldLoader(version)

  // const diamondSquare = require('diamond-square')({ version, seed: Math.floor(Math.random() * Math.pow(2, 31)) })

  //@ts-ignore
  const chunk1 = new Chunk()
  //@ts-ignore
  const chunk2 = new Chunk()
  chunk1.setBlockStateId(targetPos, 34)
  chunk2.setBlockStateId(targetPos.offset(1, 0, 0), 34)
  const world = new World((chunkX, chunkZ) => {
    // if (chunkX === 0 && chunkZ === 0) return chunk1
    // if (chunkX === 1 && chunkZ === 0) return chunk2
    //@ts-ignore
    const chunk = new Chunk()
    return chunk
  })

  // await schem.paste(world, new Vec3(0, 60, 0))

  const worldView = new WorldDataEmitter(world, viewDistance, targetPos)
  const viewer = new Viewer(null as any | null, 1)
  globalThis.viewer = viewer

  initWeblRenderer()

  return

  // Create viewer

  viewer.listen(worldView)
  // Load chunks
  await worldView.init(targetPos)
  window['worldView'] = worldView
  window['viewer'] = viewer

  function degrees_to_radians(degrees) {
    var pi = Math.PI;
    return degrees * (pi / 180);
  }

  // const jsonData = await fetch('https://bluecolored.de/bluemap/maps/overworld/tiles/0/x-2/2/z1/6.json?584662').then(r => r.json())

  // const uniforms = {
  //   distance: { value: 0 },
  //   sunlightStrength: { value: 1 },
  //   ambientLight: { value: 0 },
  //   skyColor: { value: new THREE.Color(0.5, 0.5, 1) },
  //   voidColor: { value: new THREE.Color(0, 0, 0) },
  //   hiresTileMap: {
  //     value: {
  //       map: null,
  //       size: 100,
  //       scale: new THREE.Vector2(1, 1),
  //       translate: new THREE.Vector2(),
  //       pos: new THREE.Vector2(),
  //     }
  //   }

  // }

  // const shader1 = new THREE.ShaderMaterial({
  //   uniforms: uniforms,
  //   vertexShader: [0, 0, 0, 0],
  //   fragmentShader: fragmentShader,
  //   transparent: false,
  //   depthWrite: true,
  //   depthTest: true,
  //   vertexColors: true,
  //   side: THREE.FrontSide,
  //   wireframe: false
  // })
}
main()
