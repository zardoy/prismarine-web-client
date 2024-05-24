import _ from 'lodash'
import { WorldDataEmitter, Viewer } from '../viewer'
import { Vec3 } from 'vec3'
import BlockLoader from 'prismarine-block'
import ChunkLoader from 'prismarine-chunk'
import WorldLoader from 'prismarine-world'
import * as THREE from 'three'
import { GUI } from 'lil-gui'
import { toMajor } from '../viewer/lib/version'
import { loadScript } from '../viewer/lib/utils'
import JSZip from 'jszip'
import { TWEEN_DURATION } from '../viewer/lib/entities'
import { EntityMesh } from '../viewer/lib/entity/EntityMesh'
// import * as Mathgl from 'math.gl'
import { findTextureInBlockStates } from '../../src/playerWindows'
import { initWebgpuRenderer, loadFixtureSides, setAnimationTick } from './webgpuRendererMain'
import { renderToDom } from '@zardoy/react-util'

globalThis.THREE = THREE
//@ts-ignore
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

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
  camera: '',
  playSound () { },
  blockIsomorphicRenderBundle () { },
  animationTick: 0
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

const enableControls = new URLSearchParams(window.location.search).get('controls') === 'true'

async function main () {
  let continuousRender = false

  // const { version } = params
  let fixtureUrl = qs.get('fixture')
  let fixture: undefined | Record<string, any>
  if (fixtureUrl) {
    console.log('Loading fixture')
    fixture = await fetch(fixtureUrl).then(r => r.json())
    console.log('Loaded fixture')
  }
  const version = fixture?.version ?? '1.20.2'
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
  const animationController = gui.add(params, 'animationTick', -1, 20, 1).listen()
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
  chunk1.setBlockStateId(targetPos, 1)
  chunk2.setBlockStateId(targetPos.offset(1, 0, 0), 1)
  chunk1.setBlockStateId(targetPos.offset(0, 1, 1), 2)
  // chunk1.setBlockStateId(targetPos.offset(0, 1, 0), 1)
  // chunk1.setBlockStateId(targetPos.offset(1, 1, 0), 1)
  // chunk1.setBlockStateId(targetPos.offset(-1, 1, 0), 1)
  //@ts-ignore
  const world = new World((chunkX, chunkZ) => {
    // if (chunkX === 0 && chunkZ === 0) return chunk1
    // if (chunkX === 1 && chunkZ === 0) return chunk2
    //@ts-ignore
    const chunk = new Chunk()
    return chunk
  })

  let stopUpdate = false
  // let stopUpdate = true

  // await schem.paste(world, new Vec3(0, 60, 0))

  const worldView = new WorldDataEmitter(world, viewDistance, targetPos)
  const nullRenderer = new THREE.WebGLRenderer({ antialias: true })
  const viewer = new Viewer(nullRenderer, { numWorkers: 1, showChunkBorders: false })
  viewer.world.stopBlockUpdate = stopUpdate
  viewer.setVersion(version)
  globalThis.viewer = viewer

  await initWebgpuRenderer(version, () => { }, !enableControls && !fixture, true)
  const simpleControls = () => {
    let pressedKeys = new Set()
    const loop = () => {
      // Create a vector that points in the direction the camera is looking
      let direction = new THREE.Vector3(0, 0, 0)
      if (pressedKeys.has('KeyW')) {
        direction.z = -0.5
      }
      if (pressedKeys.has('KeyS')) {
        direction.z += 0.5
      }
      if (pressedKeys.has('KeyA')) {
        direction.x -= 0.5
      }
      if (pressedKeys.has('KeyD')) {
        direction.x += 0.5
      }


      if (pressedKeys.has('ShiftLeft')) {
        viewer.camera.position.y -= 0.5
      }
      if (pressedKeys.has('Space')) {
        viewer.camera.position.y += 0.5
      }
      direction.applyQuaternion(viewer.camera.quaternion)
      direction.y = 0
      // Add the vector to the camera's position to move the camera
      viewer.camera.position.add(direction)
    }
    setInterval(loop, 1000 / 30)
    const keys = (e) => {
      const code = e.code
      const pressed = e.type === 'keydown'
      if (pressed) {
        pressedKeys.add(code)
      } else {
        pressedKeys.delete(code)
      }
    }
    window.addEventListener('keydown', keys)
    window.addEventListener('keyup', keys)

    // mouse
    const mouse = { x: 0, y: 0 }
    const mouseMove = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('.lil-gui')) return
      if (e.buttons === 1 || e.pointerType === 'touch') {
        viewer.camera.rotation.x -= e.movementY / 100
        //viewer.camera.
        viewer.camera.rotation.y -= e.movementX / 100
        if (viewer.camera.rotation.x < -Math.PI / 2) viewer.camera.rotation.x = -Math.PI / 2
        if (viewer.camera.rotation.x > Math.PI / 2) viewer.camera.rotation.x = Math.PI / 2

        // yaw += e.movementY / 20;
        // pitch += e.movementX / 20;
      }
      if (e.buttons === 2) {
        viewer.camera.position.set(0, 0, 0)
      }
    }
    window.addEventListener('pointermove', mouseMove)
  }
  viewer.camera.position.set(0, 0, 8)
  simpleControls()
  renderPlayground()

  const writeToIndexedDb = async (name, data) => {
    const db = await window.indexedDB.open(name, 1)
    db.onupgradeneeded = (e) => {
      const db = (e.target as any).result
      db.createObjectStore(name)
    }
    db.onsuccess = (e) => {
      const db = (e.target as any).result
      const tx = db.transaction(name, 'readwrite')
      const store = tx.objectStore(name)
      store.add(data, name)
    }
  }

  if (fixture) {
    loadFixtureSides(fixture.sides)
    const pos = fixture.camera[0]
    viewer.camera.position.set(pos[0], pos[1], pos[2])
  }

  return

  // Create viewer

  viewer.listen(worldView)
  // Load chunks
  await worldView.init(targetPos)
  window['worldView'] = worldView
  window['viewer'] = viewer

  //@ts-ignore
  // const controls = new OrbitControls(viewer.camera, nullRenderer.domElement)
  // controls.target.set(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)

  const cameraPos = targetPos.offset(2, 2, 2)
  const pitch = THREE.MathUtils.degToRad(-45)
  const yaw = THREE.MathUtils.degToRad(45)
  viewer.camera.rotation.set(pitch, yaw, 0, 'ZYX')
  // viewer.camera.lookAt(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)
  viewer.camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z)
  // controls.update()

  let blockProps = {}
  let entityOverrides = {}
  const getBlock = () => {
    return mcData.blocksByName[params.block || 'air']
  }

  const entityUpdateShared = () => {
    viewer.entities.clear()
    if (!params.entity) return
    worldView.emit('entity', {
      id: 'id', name: params.entity, pos: targetPos.offset(0.5, 1, 0.5), width: 1, height: 1, username: localStorage.testUsername, yaw: Math.PI, pitch: 0
    })
    const enableSkeletonDebug = (obj) => {
      const { children, isSkeletonHelper } = obj
      if (!Array.isArray(children)) return
      if (isSkeletonHelper) {
        obj.visible = true
        return
      }
      for (const child of children) {
        if (typeof child === 'object') enableSkeletonDebug(child)
      }
    }
    enableSkeletonDebug(viewer.entities.entities['id'])
    setTimeout(() => {
      viewer.render()
    }, TWEEN_DURATION)
  }

  params.block ||= 'stone'

  let textureAnimation: TextureAnimation | undefined
  const onUpdate = {
    block () {
      metadataFolder.destroy()
      const block = mcData.blocksByName[params.block]
      if (!block) return
      const props = new Block(block.id, 0, 0).getProperties()
      //@ts-ignore
      const { states } = mcData.blocksByStateId[getBlock()?.minStateId] ?? {}
      metadataFolder = gui.addFolder('metadata')
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
            metadataFolder.add(blockProps, state.name, state.values)
          } else {
            metadataFolder.add(blockProps, state.name)
          }
        }
      } else {
        for (const [name, value] of Object.entries(props)) {
          blockProps[name] = value
          metadataFolder.add(blockProps, name)
        }
      }
      metadataFolder.open()
    },
    entity () {
      continuousRender = params.entity === 'player'
      entityUpdateShared()
      if (!params.entity) return
      if (params.entity === 'player') {
        viewer.entities.updatePlayerSkin('id', viewer.entities.entities.id.username, true, true)
        viewer.entities.playAnimation('id', 'running')
      }
      // let prev = false
      // setInterval(() => {
      //   viewer.entities.playAnimation('id', prev ? 'running' : 'idle')
      //   prev = !prev
      // }, 1000)

      EntityMesh.getStaticData(params.entity)
      // entityRotationFolder.destroy()
      // entityRotationFolder = gui.addFolder('entity metadata')
      // entityRotationFolder.add(params, 'entityRotate')
      // entityRotationFolder.open()
    },
    supportBlock () {
      viewer.setBlockStateId(targetPos.offset(0, -1, 0), params.supportBlock ? 1 : 0)
    },
    animationTick () {
      const webgl = (viewer.world as WorldRendererWebgpu).playgroundGetWebglData()
      if (!webgl?.animation) {
        setAnimationTick(0)
        return
      }
      if (params.animationTick === -1) {
        textureAnimation = new TextureAnimation(new Proxy({} as any, {
          set (t, p, v) {
            if (p === 'tick') {
              setAnimationTick(v)
            }
            return true
          }
        }), webgl.animation, webgl.animation.framesCount)
      } else {
        setAnimationTick(params.animationTick)
        textureAnimation = undefined
      }
    }
  }


  const applyChanges = (metadataUpdate = false, skipQs = false) => {
    const blockId = getBlock()?.id
    let block: BlockLoader.Block
    if (metadataUpdate) {
      block = new Block(blockId, 0, params.metadata)
      Object.assign(blockProps, block.getProperties())
      for (const _child of metadataFolder.children) {
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
    console.log('up stateId', block.stateId)
    params.metadata = block.metadata
    metadataGui.updateDisplay()
    if (!skipQs) {
      setQs()
    }
  }
  gui.onChange(({ property, object }) => {
    if (object === params) {
      if (property === 'camera') return
      onUpdate[property]?.()
      if (property !== 'animationTick') {
        applyChanges(property === 'metadata')
      }
    } else {
      applyChanges()
    }
  })
  viewer.waitForChunksToRender().then(async () => {
    for (const update of Object.values(onUpdate)) {
      update()
    }
    applyChanges(true)
    // gui.openAnimated()
  })

  const animate = () => { }
  const animate2 = () => {
    // if (controls) controls.update()
    // worldView.updatePosition(controls.target)
    viewer.render()
    window.requestAnimationFrame(animate2)
  }
  viewer.world.renderUpdateEmitter.addListener('update', () => {
    // const frames = viewer.world.hasWithFrames ? viewer.world.hasWithFrames - 1 : 0;
    const webgl = (viewer.world as WorldRendererWebgpu).playgroundGetWebglData()
    if (webgl?.animation) {
      params.animationTick = -1
      animationController.show()
      animationController.max(webgl.animation.framesCount)
    } else {
      animationController.hide()
    }
    onUpdate.animationTick()
  })
  animate2()

  // #region camera rotation param
  if (params.camera) {
    const [x, y] = params.camera.split(',')
    viewer.camera.rotation.set(parseFloat(x), parseFloat(y), 0, 'ZYX')
    // controls.update()
    console.log(viewer.camera.rotation.x, parseFloat(x))
  }
  const throttledCamQsUpdate = _.throttle(() => {
    const { camera } = viewer
    // params.camera = `${camera.rotation.x.toFixed(2)},${camera.rotation.y.toFixed(2)}`
    setQs()
  }, 200)
  // controls.addEventListener('change', () => {
  //   throttledCamQsUpdate()
  //   animate()
  // })
  // #endregion

  let time = performance.now()
  const continuousUpdate = () => {
    textureAnimation?.step(performance.now() - time)
    time = performance.now()
    requestAnimationFrame(continuousUpdate)
  }
  continuousUpdate()

  window.onresize = () => {
    if (ignoreResize) return
    // const vec3 = new THREE.Vector3()
    // vec3.set(-1, -1, -1).unproject(viewer.camera)
    // console.log(vec3)
    // box.position.set(vec3.x, vec3.y, vec3.z-1)

    const { camera } = viewer
    viewer.camera.aspect = window.innerWidth / window.innerHeight
    viewer.camera.updateProjectionMatrix()
    nullRenderer.setSize(window.innerWidth, window.innerHeight)

    animate()
  }
  window.dispatchEvent(new Event('resize'))

  params.playSound = () => {
    viewer.playSound(targetPos, 'button_click.mp3')
  }
  addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') {
      params.playSound()
    }
  }, { capture: true })
}
main()
