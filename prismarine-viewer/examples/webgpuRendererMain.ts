import { generateSpiralMatrix } from 'flying-squid/dist/utils'
import { pickObj } from '@zardoy/utils'
import { Viewer } from '../viewer/lib/viewer'
import { MesherGeometryOutput } from '../viewer/lib/mesher/shared'
import { isMobile } from '../viewer/lib/simpleUtils'
import type { workerProxyType } from './webgpuRendererWorker'
import { useWorkerProxy } from './workerProxy'
import { MessageChannelReplacement } from './messageChannel'
import { addNewStat } from '../viewer/lib/ui/newStats'
import worldBlockProvider, { WorldBlockProvider } from 'mc-assets/dist/worldBlockProvider'
import PrismarineBlock from 'prismarine-block'
import { versionToNumber } from '../viewer/prepare/utils'

let worker: Worker | MessagePort
const workerReadyProxy = Promise.withResolvers()

// eslint-disable-next-line import/no-mutable-exports
export let webgpuChannel: typeof workerProxyType['__workerProxy'] = new Proxy({}, {
  get: (target, p) => (...args) => {
    void workerReadyProxy.promise.then(() => {
      webgpuChannel[p](...args)
    })
  }
}) as any // placeholder to avoid crashes

declare const viewer: Viewer

let allReceived = false
declare const customEvents
declare const bot
if (typeof customEvents !== 'undefined') {
  customEvents.on('gameLoaded', () => {
    const chunksExpected = generateSpiralMatrix(globalThis.options.renderDistance)
    let received = 0
    bot.on('chunkColumnLoad', (data) => {
      received++
      if (received === chunksExpected.length) {
        allReceived = true
        // addBlocksSection('all', viewer.world.newChunks)
      }
    })
  })
}


let isWaitingToUpload = false
globalThis.tiles = {}
export const addBlocksSection = (key, data: MesherGeometryOutput) => {
  if (globalThis.tiles[key]) return
  // ENABLE UPLOADING HERE
  // globalThis.tiles[key] = data.tiles
  webgpuChannel.addBlocksSection(data.tiles, key, false)
  if (playground && !isWaitingToUpload) {
    isWaitingToUpload = true
    // viewer.waitForChunksToRender().then(() => {
    //     isWaitingToUpload = false
    //     sendWorkerMessage({
    //         type: 'addBlocksSectionDone'
    //     })
    // })
  }
}

export const loadFixtureSides = (json) => {
  webgpuChannel.loadFixture(json)
}

export const sendCameraToWorker = () => {
  const cameraVectors = ['rotation', 'position'].reduce((acc, key) => {
    acc[key] = ['x', 'y', 'z'].reduce((acc2, key2) => {
      acc2[key2] = viewer.camera[key][key2]
      return acc2
    }, {})
    return acc
  }, {}) as any
  webgpuChannel.camera({
    ...cameraVectors,
    fov: viewer.camera.fov
  })
}

// do not use worker in safari, it is slow
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
const workerParam = new URLSearchParams(window.location.search).get('webgpuWorker')
const USE_WORKER = workerParam ? workerParam === 'true' : !isSafari

let playground = false
export const initWebgpuRenderer = async (postRender = () => { }, playgroundModeInWorker = false, actuallyPlayground = false) => {
  playground = actuallyPlayground
  // await new Promise<void>(resolve => {
  // console.log('viewer.world.material.map!.image', viewer.world.material.map!.image)
  // viewer.world.material.map!.image.onload = () => {
  //   console.log(this.material.map!.image)
  //   resolve()
  // }
  //   viewer.world.renderUpdateEmitter.once('textureDownloaded', resolve)
  // })
  const { image } = (viewer.world.material.map!)
  const imageBlob = await fetch(image.src).then(async (res) => res.blob())
  const { blocksDataModel: modelsData, allBlocksStateIdToModelIdMap } = getBlocksModelData()
  viewer.world.sendDataForWebgpuRenderer({ allBlocksStateIdToModelIdMap })

  const canvas = document.createElement('canvas')
  canvas.width = window.innerWidth * window.devicePixelRatio
  canvas.height = window.innerHeight * window.devicePixelRatio
  document.body.appendChild(canvas)
  canvas.id = 'viewer-canvas'
  console.log('starting offscreen')


  // replacable by initWebglRenderer
  if (USE_WORKER) {
    worker = new Worker('./webgpuRendererWorker.js')
  } else {
    const messageChannel = new MessageChannel()
    globalThis.webgpuRendererChannel = messageChannel
    worker = messageChannel.port1
    messageChannel.port1.start()
    messageChannel.port2.start()
    await import('./webgpuRendererWorker')
  }
  addFpsCounters()
  webgpuChannel = useWorkerProxy<typeof workerProxyType>(worker, true)
  webgpuChannel.canvas(
    canvas.transferControlToOffscreen(),
    imageBlob,
    playgroundModeInWorker,
    pickObj(localStorage, 'vertShader', 'fragShader', 'computeShader'),
    isMobile() || playground ? 490_000 : 2_000_000,
    modelsData
  )

  if (!USE_WORKER) {
    // wait for the .canvas() message to be processed (it's async since we still use message channel)
    await new Promise(resolve => {
      setTimeout(resolve, 0)
    })
  }

  let oldWidth = window.innerWidth
  let oldHeight = window.innerHeight
  const oldCamera = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  }
  let focused = true
  window.addEventListener('focus', () => {
    focused = true
    webgpuChannel.startRender()
  })
  window.addEventListener('blur', () => {
    focused = false
    webgpuChannel.stopRender()
  })
  const mainLoop = () => {
    requestAnimationFrame(mainLoop)
    if (!focused || window.stopRender) return

    if (oldWidth !== window.innerWidth || oldHeight !== window.innerHeight) {
      oldWidth = window.innerWidth
      oldHeight = window.innerHeight
      webgpuChannel.resize(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio)
    }
    postRender()
    // TODO! do it in viewer to avoid possible delays
    if (actuallyPlayground && ['rotation', 'position'].some((key) => oldCamera[key] !== viewer.camera[key])) {
      // TODO fix
      for (const [key, val] of Object.entries(oldCamera)) {
        for (const key2 of Object.keys(val)) {
          oldCamera[key][key2] = viewer.camera[key][key2]
        }
      }
      sendCameraToWorker()
    }
  }

  requestAnimationFrame(mainLoop)

  workerReadyProxy.resolve(undefined)
}

export const setAnimationTick = (tick: number, frames?: number) => {
  webgpuChannel.animationTick(tick, frames)
}

export const exportLoadedTiles = () => {
  webgpuChannel.exportData()
  const controller = new AbortController()
  worker.addEventListener('message', async (e: any) => {
    const receivedData = e.data.data
    console.log('received fixture')
    // await new Promise(resolve => {
    //     setTimeout(resolve, 0)
    // })
    try {
      const a = document.createElement('a')
      type Vec3 = [number, number, number]
      type PlayTimeline = [pos: Vec3, rot: Vec3, time: number]
      const vec3ToArr = (vec3: { x, y, z }) => [vec3.x, vec3.y, vec3.z] as Vec3
      // const dataObj = {
      //     ...receivedData,
      //     version: viewer.version,
      //     camera: [vec3ToArr(viewer.camera.position), vec3ToArr(viewer.camera.rotation)],
      //     playTimeline: [] as PlayTimeline[]
      // }
      // split into two chunks
      const objectURL = URL.createObjectURL(new Blob([receivedData.sides.buffer], { type: 'application/octet-stream' }))
      a.href = objectURL
      a.download = 'dumped-chunks-tiles.bin'
      a.click()
      URL.revokeObjectURL(objectURL)
    } finally {
      controller.abort()
    }
  }, { signal: controller.signal })
}


const addFpsCounters = () => {
  const { updateText } = addNewStat('fps', 200, undefined, 0)
  let prevTimeout
  worker.addEventListener('message', (e: any) => {
    if (e.data.type === 'fps') {
      updateText(`FPS: ${e.data.fps}`)
      if (prevTimeout) clearTimeout(prevTimeout)
      prevTimeout = setTimeout(() => {
        updateText('<hanging>')
      }, 1002)
    }
  })

  const { updateText: updateText2 } = addNewStat('fps-main', 90, 0, 20)
  let updates = 0
  const mainLoop = () => {
    requestAnimationFrame(mainLoop)
    updates++
  }
  mainLoop()
  setInterval(() => {
    updateText2(`Main Loop: ${updates}`)
    updates = 0
  }, 1000)
}

export type BlocksModelData = {
  textures: number[]
  rotation: number[]
}

export type AllBlocksDataModels = Record<string, BlocksModelData>
export type AllBlocksStateIdToModelIdMap = Record<number, number>
const getBlocksModelData = () => {
  const provider = worldBlockProvider(viewer.world.blockstatesModels, viewer.world.blocksAtlases, 'latest')
  const PBlock = PrismarineBlock(viewer.world.version!)

  const blocksDataModel = {} as AllBlocksDataModels
  let i = 0
  const allBlocksStateIdToModelIdMap = {} as AllBlocksStateIdToModelIdMap
  for (const b of loadedData.blocksArray) {
    for (let state = b.defaultState; state <= b.defaultState; state++) {
      const block = PBlock.fromStateId(state, 0)
      if (block.shapes.length === 0 || !block.shapes.every(shape => {
        return shape[0] === 0 && shape[1] === 0 && shape[2] === 0 && shape[3] === 1 && shape[4] === 1 && shape[5] === 1
      })) {
        continue
      }
      const isPreflat = versionToNumber(viewer.world.version!) < versionToNumber('1.13')
      const models = provider.getAllResolvedModels0_1({
        name: block.name,
        properties: block.getProperties()
      }, isPreflat)
      // skipping composite blocks
      if (models.length !== 1 || !models[0]![0].elements) {
        continue
      }
      const elements = models[0]![0]?.elements
      if (elements.length !== 1 && block.name !== 'grass_block') {
        continue
      }
      const elem = models[0]![0].elements[0]
      if (elem.from[0] !== 0 || elem.from[1] !== 0 || elem.from[2] !== 0 || elem.to[0] !== 16 || elem.to[1] !== 16 || elem.to[2] !== 16) {
        // not full block
        continue
      }
      const facesMapping = [
        ['front', 'south'],
        ['bottom', 'down'],
        ['top', 'up'],
        ['right', 'east'],
        ['left', 'west'],
        ['back', 'north'],
      ]
      const blockData = {
        textures: [0, 0, 0, 0, 0, 0],
        rotation: [0, 0, 0, 0, 0, 0]
      }
      for (const [face, { texture, cullface, rotation = 0 }] of Object.entries(elem.faces)) {
        const faceIndex = facesMapping.findIndex(x => x.includes(face))
        if (faceIndex === -1) {
          throw new Error(`Unknown face ${face}`)
        }
        blockData.textures[faceIndex] = texture.tileIndex
        blockData.rotation[faceIndex] = rotation / 90
        if (Math.floor(blockData.rotation[faceIndex]) !== blockData.rotation[faceIndex]) {
          throw new Error(`Invalid rotation ${rotation} ${b.name}`)
        }
      }
      const k = i++
      allBlocksStateIdToModelIdMap[block.stateId!] = k
      blocksDataModel[k] = blockData
    }
  }
  return {
    blocksDataModel,
    allBlocksStateIdToModelIdMap
  }
}

export const addWebgpuListener = (type: string, listener: (data: any) => void) => {
  void workerReadyProxy.promise.then(() => {
    worker.addEventListener('message', (e: any) => {
      if (e.data.type === type) {
        listener(e.data)
      }
    })
  })
}
