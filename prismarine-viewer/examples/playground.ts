import _ from 'lodash'
import { Vec3 } from 'vec3'
import BlockLoader from 'prismarine-block'
import ChunkLoader from 'prismarine-chunk'
import WorldLoader from 'prismarine-world'
import * as THREE from 'three'
import { GUI } from 'lil-gui'
import JSZip from 'jszip'
import blockstatesModels from 'mc-assets/dist/blockStatesModels.json'

//@ts-expect-error
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { IndexedData } from 'minecraft-data'
import { loadScript } from '../viewer/lib/utils'
import { TWEEN_DURATION } from '../viewer/lib/entities'
import { EntityMesh } from '../viewer/lib/entity/EntityMesh'
import { WorldDataEmitter, Viewer } from '../viewer'
import { toMajorVersion } from '../../src/utils'

window.THREE = THREE

const gui = new GUI()

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
  modelVariant: 0
}

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

let ignoreResize = false

async function main () {
  let continuousRender = false

  const { version } = params
  // temporary solution until web worker is here, cache data for faster reloads
  const globalMcData = window['mcData']
  if (!globalMcData['version']) {
    const major = toMajorVersion(version)
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

  // await schem.paste(world, new Vec3(0, 60, 0))

  const worldView = new WorldDataEmitter(world, viewDistance, targetPos)

  // Create three.js context, add to page
  const renderer = new THREE.WebGLRenderer({ alpha: true, ...localStorage['renderer'] })
  renderer.setPixelRatio(window.devicePixelRatio || 1)
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  // Create viewer
  const viewer = new Viewer(renderer, { numWorkers: 1, showChunkBorders: false, })
  viewer.world.blockstatesModels = blockstatesModels
  viewer.entities.setDebugMode('basic')
  viewer.setVersion(version)
  viewer.entities.onSkinUpdate = () => {
    viewer.render()
  }
  viewer.world.mesherConfig.enableLighting = false

  viewer.listen(worldView)
  // Load chunks
  await worldView.init(targetPos)
  window['worldView'] = worldView
  window['viewer'] = viewer

  params.blockIsomorphicRenderBundle = () => {
    const canvas = renderer.domElement
    const onlyCurrent = !confirm('Ok - render all blocks, Cancel - render only current one')
    const sizeRaw = prompt('Size', '512')
    if (!sizeRaw) return
    const size = parseInt(sizeRaw, 10)
    // const size = 512

    ignoreResize = true
    canvas.width = size
    canvas.height = size
    renderer.setSize(size, size)

    //@ts-expect-error
    viewer.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10)
    viewer.scene.background = null

    const rad = THREE.MathUtils.degToRad(-120)
    viewer.directionalLight.position.set(
      Math.cos(rad),
      Math.sin(rad),
      0.2
    ).normalize()
    viewer.directionalLight.intensity = 1

    const cameraPos = targetPos.offset(2, 2, 2)
    const pitch = THREE.MathUtils.degToRad(-30)
    const yaw = THREE.MathUtils.degToRad(45)
    viewer.camera.rotation.set(pitch, yaw, 0, 'ZYX')
    // viewer.camera.lookAt(center.x + 0.5, center.y + 0.5, center.z + 0.5)
    viewer.camera.position.set(cameraPos.x + 1, cameraPos.y + 0.5, cameraPos.z + 1)

    const allBlocks = mcData.blocksArray.map(b => b.name)
    // const allBlocks = ['stone', 'warped_slab']

    let blockCount = 1
    let blockName = allBlocks[0]

    const updateBlock = () => {
      // viewer.setBlockStateId(targetPos, mcData.blocksByName[blockName].minStateId)
      params.block = blockName
      // todo cleanup (introduce getDefaultState)
      onUpdate.block()
      applyChanges(false, true)
    }
    void viewer.waitForChunksToRender().then(async () => {
      // wait for next macro task
      await new Promise(resolve => {
        setTimeout(resolve, 0)
      })
      if (onlyCurrent) {
        viewer.render()
        onWorldUpdate()
      } else {
        // will be called on every render update
        viewer.world.renderUpdateEmitter.addListener('update', onWorldUpdate)
        updateBlock()
      }
    })

    const zip = new JSZip()
    zip.file('description.txt', 'Generated with prismarine-viewer')

    const end = async () => {
      // download zip file

      const a = document.createElement('a')
      const blob = await zip.generateAsync({ type: 'blob' })
      const dataUrlZip = URL.createObjectURL(blob)
      a.href = dataUrlZip
      a.download = 'blocks_render.zip'
      a.click()
      URL.revokeObjectURL(dataUrlZip)
      console.log('end')

      viewer.world.renderUpdateEmitter.removeListener('update', onWorldUpdate)
    }

    async function onWorldUpdate () {
      // await new Promise(resolve => {
      //   setTimeout(resolve, 50)
      // })
      const dataUrl = canvas.toDataURL('image/png')

      zip.file(`${blockName}.png`, dataUrl.split(',')[1], { base64: true })

      if (onlyCurrent) {
        end()
      } else {
        nextBlock()
      }
    }
    const nextBlock = async () => {
      blockName = allBlocks[blockCount++]
      console.log(allBlocks.length, '/', blockCount, blockName)
      if (blockCount % 5 === 0) {
        await new Promise(resolve => {
          setTimeout(resolve, 100)
        })
      }
      if (blockName) {
        updateBlock()
      } else {
        end()
      }
    }
  }

  const controls = new OrbitControls(viewer.camera, renderer.domElement)
  controls.target.set(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)

  const cameraPos = targetPos.offset(2, 2, 2)
  const pitch = THREE.MathUtils.degToRad(-45)
  const yaw = THREE.MathUtils.degToRad(45)
  viewer.camera.rotation.set(pitch, yaw, 0, 'ZYX')
  viewer.camera.lookAt(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)
  viewer.camera.position.set(cameraPos.x + 0.5, cameraPos.y + 0.5, cameraPos.z + 0.5)
  controls.update()

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
      viewer.render()
    }, TWEEN_DURATION)
  }

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
      applyChanges(property === 'metadata')
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
    gui.openAnimated()
  })

  const animate = () => {
    // if (controls) controls.update()
    // worldView.updatePosition(controls.target)
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

  const continuousUpdate = () => {
    if (continuousRender) {
      animate()
    }
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
    renderer.setSize(window.innerWidth, window.innerHeight)

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
