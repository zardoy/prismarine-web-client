import _ from 'lodash'
import { Vec3 } from 'vec3'
import BlockLoader from 'prismarine-block'
import ChunkLoader from 'prismarine-chunk'
import WorldLoader from 'prismarine-world'
import * as THREE from 'three'
import { GUI } from 'lil-gui'
import JSZip from 'jszip'
import blockstatesModels from 'mc-assets/dist/blockStatesModels.json'
// import * as Mathgl from 'math.gl'
import { renderToDom } from '@zardoy/react-util'

//@ts-expect-error
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { IndexedData } from 'minecraft-data'
import { loadScript } from '../viewer/lib/utils'
import { TWEEN_DURATION } from '../viewer/lib/entities'
import { EntityMesh } from '../viewer/lib/entity/EntityMesh'
import { WorldDataEmitter, Viewer } from '../viewer'
import '../../src/getCollisionShapes'
import { toMajorVersion } from '../../src/utils'
import { WorldRendererWebgpu } from '../viewer/lib/worldrendererWebgpu'
import { renderPlayground } from './TouchControls2'
import { initWebgpuRenderer, loadFixtureSides, setAnimationTick, webgpuChannel } from './webgpuRendererMain'
import { TextureAnimation } from './TextureAnimation'
import { BlockType } from './shared'
import { addNewStat } from './newStats'
import { defaultWebgpuRendererParams } from './webgpuRendererShared'

window.THREE = THREE

const gui = new GUI()
const gui2 = new GUI()
const { updateText: updateTextEvent } = addNewStat('events', 90, 0, 40)

// initial values
const params = {
  skipQs: '',
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
  modelVariant: 0,
  animationTick: 0
}

const rendererParams = { ...defaultWebgpuRendererParams }

const qs = new URLSearchParams(window.location.search)
for (const [key, value] of qs.entries()) {
  const parsed = /^-?\d+$/.test(value) ? Number(value) : value === 'true' ? true : value === 'false' ? false : value
  params[key] = parsed
}
const setQs = () => {
  const newQs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (!value || typeof value === 'function' || params.skipQs.includes(key)) continue
    newQs.set(key, value)
  }
  window.history.replaceState({}, '', `${window.location.pathname}?${newQs.toString()}`)
}

const ignoreResize = false

const enableControls = new URLSearchParams(window.location.search).get('controls') === 'true'

async function main () {
  let continuousRender = false

  const fixtureUrl = qs.get('fixture')
  let fixture: undefined | Record<string, any>
  if (fixtureUrl) {
    console.log('Loading fixture')
    fixture = await fetch(fixtureUrl).then(async r => r.json())
    console.log('Loaded fixture')
  }
  const { version } = params
  await window._LOAD_MC_DATA()
  // temporary solution until web worker is here, cache data for faster reloads
  // const globalMcData = window['mcData']
  // if (!globalMcData['version']) {
  //   const major = toMajorVersion(version)
  //   const sessionKey = `mcData-${major}`
  //   if (sessionStorage[sessionKey]) {
  //     Object.assign(globalMcData, JSON.parse(sessionStorage[sessionKey]))
  //   } else {
  //     if (sessionStorage.length > 1) sessionStorage.clear()
  //     try {
  //       sessionStorage[sessionKey] = JSON.stringify(Object.fromEntries(Object.entries(globalMcData).filter(([ver]) => ver.startsWith(major))))
  //     } catch { }
  //   }
  // }

  const mcData: IndexedData = require('minecraft-data')(version)
  window['loadedData'] = mcData

  gui.add(params, 'version', globalThis.includedVersions)
  gui.add(params, 'block', mcData.blocksArray.map(b => b.name).sort((a, b) => a.localeCompare(b)))
  const metadataGui = gui.add(params, 'metadata')
  gui.add(params, 'modelVariant')
  gui.add(params, 'supportBlock')
  gui.add(params, 'entity', mcData.entitiesArray.map(b => b.name).sort((a, b) => a.localeCompare(b))).listen()
  gui.add(params, 'removeEntity')
  gui.add(params, 'entityRotate')
  gui.add(params, 'skipQs')
  gui.add(params, 'playSound')
  gui.add(params, 'blockIsomorphicRenderBundle')
  const animationController = gui.add(params, 'animationTick', -1, 20, 1).listen()
  gui.open(false)

  for (const key of Object.keys(defaultWebgpuRendererParams)) {
    gui2.add(rendererParams, key)
  }
  gui2.open(false)
  webgpuChannel.updateConfig(rendererParams)
  gui2.onChange(() => {
    webgpuChannel.updateConfig(rendererParams)
  })
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

  //@ts-expect-error
  const chunk1 = new Chunk()
  //@ts-expect-error
  const chunk2 = new Chunk()
  chunk1.setBlockStateId(targetPos, 34)
  chunk2.setBlockStateId(targetPos.offset(1, 0, 0), 34)
  //@ts-expect-error
  const world = new World((chunkX, chunkZ) => {
    // if (chunkX === 0 && chunkZ === 0) return chunk1
    // if (chunkX === 1 && chunkZ === 0) return chunk2
    //@ts-expect-error
    const chunk = new Chunk()
    return chunk
  })

  const stopUpdate = false
  // let stopUpdate = true

  // await schem.paste(world, new Vec3(0, 60, 0))

  const worldView = new WorldDataEmitter(world, viewDistance, targetPos)

  const viewer = new Viewer({
    render () { },
    getSize () { return { width: window.innerWidth, height: window.innerHeight } },
    getPixelRatio () { return window.devicePixelRatio },
  } as any, { numWorkers: 1, showChunkBorders: false })
  viewer.world.blockstatesModels = blockstatesModels
  viewer.entities.setDebugMode('basic')
  viewer.world.stopBlockUpdate = stopUpdate
  viewer.setVersion(version)
  window.viewer = viewer

  await initWebgpuRenderer(() => { }, !enableControls && !fixture, true)
  const simpleControls = () => {
    const pressedKeys = new Set<string>()
    const loop = () => {
      // Create a vector that points in the direction the camera is looking
      const direction = new THREE.Vector3(0, 0, 0)
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

      if (pressedKeys.has('ShiftLeft')) {
        direction.y *= 2
        direction.x *= 2
        direction.z *= 2
      }
      // Add the vector to the camera's position to move the camera
      viewer.camera.position.add(direction)
    }
    setInterval(loop, 1000 / 30)
    const keys = (e) => {
      const { code } = e
      const pressed = e.type === 'keydown'
      if (pressed) {
        pressedKeys.add(code)
      } else {
        pressedKeys.delete(code)
      }
    }
    window.addEventListener('keydown', keys)
    window.addEventListener('keyup', keys)
    window.addEventListener('blur', (e) => {
      for (const key of pressedKeys) {
        keys(new KeyboardEvent('keyup', { code: key }))
      }
    })

    // mouse
    const mouse = { x: 0, y: 0 }
    let mouseMoveCounter = 0
    const mouseMove = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('.lil-gui')) return
      if (e.buttons === 1 || e.pointerType === 'touch') {
        mouseMoveCounter++
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
    setInterval(() => {
      updateTextEvent(`Mouse Events: ${mouseMoveCounter}`)
      mouseMoveCounter = 0
    }, 1000)
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

  const blocks: Record<string, BlockType> = {}
  const i = 0
  console.log('generating random data')
  webgpuChannel.generateRandom(Math.sqrt(160_000))

  // webgpuChannel.generateRandom(100)
  // setTimeout(() => {
  //   webgpuChannel.generateRandom(100, 15)
  // }, 3000)

  return

  // Create viewer

  viewer.listen(worldView)
  // Load chunks
  await worldView.init(targetPos)
  window['worldView'] = worldView
  window['viewer'] = viewer

  //@ts-expect-error
  //const controls = new OrbitControls(viewer.camera, nullRenderer.domElement)
  // controls.target.set(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)

  const cameraPos = targetPos.offset(2, 2, 2)
  const pitch = THREE.MathUtils.degToRad(-45)
  const yaw = THREE.MathUtils.degToRad(45)
  viewer.camera.rotation.set(pitch, yaw, 0, 'ZYX')
  // viewer.camera.lookAt(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)
  viewer.camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z)
  // controls.update()

  let blockProps = {}
  const entityOverrides = {}
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
      // viewer.render()
    }, TWEEN_DURATION)
  }

  params.block ||= 'stone'

  let textureAnimation: TextureAnimation | undefined
  const onUpdate = {
    version (initialUpdate) {
      // if (initialUpdate) return
      // viewer.world.texturesVersion = params.version
      // viewer.world.updateTexturesData()
      // todo warning
    },
    block () {
      blockProps = {}
      metadataFolder.destroy()
      const block = mcData.blocksByName[params.block]
      if (!block) return
      console.log('block', block.name)
      const props = new Block(block.id, 0, 0).getProperties()
      //@ts-expect-error
      const { states } = mcData.blocksByStateId[getBlock()?.minStateId] ?? {}
      metadataFolder = gui.addFolder('metadata')
      if (states) {
        for (const state of states) {
          let defaultValue: string | number | boolean
          if (state.values) { // int, enum
            defaultValue = state.values[0]
          } else {
            switch (state.type) {
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
          }
          blockProps[state.name] = defaultValue
          if (state.values) {
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
      console.log('props', blockProps)
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
    modelVariant () {
      viewer.world.mesherConfig.debugModelVariant = params.modelVariant === 0 ? undefined : [params.modelVariant]
    },
    animationTick () {
      // TODO
      const webgl = (viewer.world).playgroundGetWebglData() as unknown as { animation: any }
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
        block = Block.fromProperties(blockId ?? -1, blockProps, 0)
      } catch (err) {
        console.error(err)
        block = Block.fromStateId(0, 0)
      }
    }

    //@ts-expect-error
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
  void viewer.waitForChunksToRender().then(async () => {
    // TODO!
    await new Promise(resolve => {
      setTimeout(resolve, 50)
    })
    for (const update of Object.values(onUpdate)) {
      update(true)
    }
    applyChanges()
    // gui.openAnimated()
  })

  const animate = () => { }
  const animate2 = () => {
    // if (controls) controls.update()
    // worldView.updatePosition(controls.target)
    // viewer.render()
    window.requestAnimationFrame(animate2)
  }
  viewer.world.renderUpdateEmitter.addListener('update', () => {
    // const frames = viewer.world.hasWithFrames ? viewer.world.hasWithFrames - 1 : 0;
    const webgl = (viewer.world).playgroundGetWebglData()
    // if (webgl?.animation) {
    //   params.animationTick = -1
    //   animationController.show()
    //   animationController.max(webgl.animation.framesCount)
    // } else {
    //   animationController.hide()
    // }
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
