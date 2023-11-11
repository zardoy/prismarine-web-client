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
  removeEntity () {
    this.entity = ''
  },
  entityRotate: false,
  camera: ''
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

async function main () {
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
  gui.add(params, 'block', mcData.blocksArray.map(b => b.name))
  const metadataGui = gui.add(params, 'metadata')
  gui.add(params, 'supportBlock')
  gui.add(params, 'entity', mcData.entitiesArray.map(b => b.name)).listen()
  gui.add(params, 'removeEntity')
  gui.add(params, 'entityRotate')
  gui.add(params, 'skip')
  gui.open(false)
  let folder = gui.addFolder('metadata')

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

  // Create three.js context, add to page
  const renderer = new THREE.WebGLRenderer()
  renderer.setPixelRatio(window.devicePixelRatio || 1)
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  // Create viewer
  const viewer = new Viewer(renderer)
  viewer.setVersion(version)

  viewer.listen(worldView)
  // Load chunks
  await worldView.init(targetPos)
  window['worldView'] = worldView
  window['viewer'] = viewer


  //@ts-ignore
  const controls = new globalThis.THREE.OrbitControls(viewer.camera, renderer.domElement)
  controls.target.set(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)

  const cameraPos = targetPos.offset(2, 2, 2)
  const pitch = THREE.MathUtils.degToRad(-45)
  const yaw = THREE.MathUtils.degToRad(45)
  viewer.camera.rotation.set(pitch, yaw, 0, 'ZYX')
  viewer.camera.lookAt(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)
  viewer.camera.position.set(cameraPos.x + 0.5, cameraPos.y + 0.5, cameraPos.z + 0.5)
  controls.update()

  let blockProps = {}
  const getBlock = () => {
    return mcData.blocksByName[params.block || 'air']
  }
  const onUpdate = {
    block () {
      folder.destroy()
      const block = mcData.blocksByName[params.block]
      if (!block) return
      const props = new Block(block.id, 0, 0).getProperties()
      //@ts-ignore
      const { states } = mcData.blocksByStateId[getBlock()?.minStateId] ?? {}
      folder = gui.addFolder('metadata')
      if (states) {
        for (const state of states) {
          let defaultValue
          switch (state.type) {
            case 'enum':
              defaultValue = state.values[0]
              break
            case 'bool':
              defaultValue = false
              break
            case 'int':
              defaultValue = 0
              break
            case 'direction':
              defaultValue = 'north'
              break

            default:
              continue
          }
          blockProps[state.name] = defaultValue
          if (state.type === 'enum') {
            folder.add(blockProps, state.name, state.values)
          } else {
            folder.add(blockProps, state.name)
          }
        }
      } else {
        for (const [name, value] of Object.entries(props)) {
          blockProps[name] = value
          folder.add(blockProps, name)
        }
      }
      folder.open()
    },
    entity () {
      viewer.entities.clear()
      if (!params.entity) return
      worldView.emit('entity', {
        id: 'id', name: params.entity, pos: targetPos.offset(0, 1, 0), width: 1, height: 1, username: 'username'
      })
    }
  }


  const applyChanges = (metadataUpdate = false) => {
    const blockId = getBlock()?.id
    let block: BlockLoader.Block
    if (metadataUpdate) {
      block = new Block(blockId, 0, params.metadata)
      Object.assign(blockProps, block.getProperties())
      for (const _child of folder.children) {
        const child = _child as import('lil-gui').Controller
        child.updateDisplay()
      }
    } else {
      try {
        //@ts-ignore
        block = Block.fromProperties(blockId ?? -1, blockProps, 0)
      } catch (err) {
        console.error(err)
        block = Block.fromStateId(0, 0)
      }
    }

    //@ts-ignore
    viewer.setBlockStateId(targetPos, block.stateId)
    console.log('up', block.stateId)
    params.metadata = block.metadata
    metadataGui.updateDisplay()
    viewer.setBlockStateId(targetPos.offset(0, -1, 0), params.supportBlock ? 1 : 0)
    setQs()
  }
  gui.onChange(({ property }) => {
    if (property === 'camera') return
    onUpdate[property]?.()
    applyChanges(property === 'metadata')
  })
  viewer.waitForChunksToRender().then(async () => {
    await new Promise(resolve => {
      setTimeout(resolve, 0)
    })
    for (const update of Object.values(onUpdate)) {
      update()
    }
    applyChanges(true)
    gui.openAnimated()
  })

  // Browser animation loop
  const animate = () => {
    // if (controls) controls.update()
    // worldView.updatePosition(controls.target)
    viewer.update()
    viewer.render()
    // window.requestAnimationFrame(animate)
  }
  viewer.world.renderUpdateEmitter.addListener('update', () => {
    animate()
  })
  animate()

  // #region camera rotation param
  if (params.camera) {
    const [x, y] = params.camera.split(',')
    viewer.camera.rotation.set(parseFloat(x), parseFloat(y), 0, 'ZYX')
    controls.update()
    console.log(viewer.camera.rotation.x, parseFloat(x))
  }
  const throttledCamQsUpdate = _.throttle(() => {
    const { camera } = viewer
    // params.camera = `${camera.rotation.x.toFixed(2)},${camera.rotation.y.toFixed(2)}`
    setQs()
  }, 200)
  controls.addEventListener('change', () => {
    throttledCamQsUpdate()
    animate()
  })
  // #endregion

  window.onresize = () => {
    // const vec3 = new THREE.Vector3()
    // vec3.set(-1, -1, -1).unproject(viewer.camera)
    // console.log(vec3)
    // box.position.set(vec3.x, vec3.y, vec3.z-1)

    const { camera } = viewer
    viewer.camera.aspect = window.innerWidth / window.innerHeight
    viewer.camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)

    animate()
  }
  window.dispatchEvent(new Event('resize'))

  setTimeout(() => {
    // worldView.emit('entity', {
    //   id: 'id', name: 'player', pos: center.offset(1, -2, 0), width: 1, height: 1, username: 'username'
    // })
  }, 1500)
}
main()
