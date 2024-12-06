/// <reference types="@webgpu/types" />
import * as THREE from 'three'
import * as tweenJs from '@tweenjs/tween.js'
import { BlockFaceType, BlockType, makeError } from './shared'
import { createWorkerProxy } from './workerProxy'
import { WebgpuRenderer } from './webgpuRenderer'
import { RendererParams } from './webgpuRendererShared'
import { ChunksStorage } from './chunksStorage'

export const chunksStorage = new ChunksStorage()
globalThis.chunksStorage = chunksStorage

let animationTick = 0

const camera = new THREE.PerspectiveCamera(75, 1 / 1, 0.1, 10_000)
globalThis.camera = camera

let webgpuRenderer: WebgpuRenderer | undefined

export const postMessage = (data, ...args) => {
  if (globalThis.webgpuRendererChannel) {
    globalThis.webgpuRendererChannel.port2.postMessage(data, ...args)
  } else {
    globalThis.postMessage(data, ...args)
  }
}

setInterval(() => {
  if (!webgpuRenderer) return
  // console.log('FPS:', renderedFrames)
  postMessage({ type: 'fps', fps: `${webgpuRenderer.renderedFrames} (${new Intl.NumberFormat().format(chunksStorage.lastFetchedSize)} blocks)` })
  webgpuRenderer.renderedFrames = 0
}, 1000)

setInterval(() => {
  postMessage({ type: 'stats', stats: `Rendering Tiles: ${formatLargeNumber(webgpuRenderer?.renderingStats?.instanceCount ?? -1, false)} Buffer: ${formatLargeNumber(webgpuRenderer?.NUMBER_OF_CUBES ?? -1)}` })
}, 300)

const formatLargeNumber = (number: number, compact = true) => {
  return new Intl.NumberFormat(undefined, { notation: compact ? 'compact' : 'standard', compactDisplay: 'short' }).format(number)
}

export const updateSize = (width, height) => {
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}


// const updateCubesWhenAvailable = () => {
//   onceRendererAvailable((renderer) => {
//     renderer.updateSides()
//   })
// }

let requests = [] as Array<{ resolve: () => void }>
let requestsNamed = {} as Record<string, () => void>
const onceRendererAvailable = (request: (renderer: WebgpuRenderer) => any, name?: string) => {
  if (webgpuRenderer?.ready) {
    request(webgpuRenderer)
  } else {
    requests.push({ resolve: () => request(webgpuRenderer!) })
    if (name) {
      requestsNamed[name] = () => request(webgpuRenderer!)
    }
  }
}

const availableUpCheck = setInterval(() => {
  const { ready } = webgpuRenderer ?? {}
  if (ready) {
    clearInterval(availableUpCheck)
    for (const request of requests) {
      request.resolve()
    }
    requests = []
    for (const request of Object.values(requestsNamed)) {
      request()
    }
    requestsNamed = {}
  }
}, 100)

let started = false
let autoTickUpdate = undefined as number | undefined

export const workerProxyType = createWorkerProxy({
  // eslint-disable-next-line max-params
  canvas (canvas, imageBlob, isPlayground, localStorage, blocksDataModel) {
    if (globalThis.webgpuRendererChannel) {
      // HACK! IOS safari bug: no support for transferControlToOffscreen in the same context! so we create a new canvas here!
      const newCanvas = document.createElement('canvas')
      newCanvas.width = canvas.width
      newCanvas.height = canvas.height
      canvas = newCanvas
      // remove existing canvas
      document.querySelector('#viewer-canvas')!.remove()
      canvas.id = 'viewer-canvas'
      document.body.appendChild(canvas)
    }
    started = true
    webgpuRenderer = new WebgpuRenderer(canvas, imageBlob, isPlayground, camera, localStorage, blocksDataModel)
    globalThis.webgpuRenderer = webgpuRenderer
    postMessage({ type: 'webgpuRendererReady' })
  },
  startRender () {
    if (!webgpuRenderer) return
    webgpuRenderer.rendering = true
  },
  stopRender () {
    if (!webgpuRenderer) return
    webgpuRenderer.rendering = false
  },
  resize (newWidth, newHeight) {
    updateSize(newWidth, newHeight)
  },
  updateConfig (params: RendererParams) {
    // when available
    onceRendererAvailable(() => {
      webgpuRenderer?.updateConfig(params)
    })
  },
  getFaces () {
    const faces = [] as any[]
    const getFace = (face: number) => {
      // if (offsetZ / 16) debugger
      return {
        side: face,
        textureIndex: Math.floor(Math.random() * 512)
        // textureIndex: offsetZ / 16 === 31 ? 2 : 1
      }
    }
    for (let i = 0; i < 6; i++) {
      faces.push(getFace(i))
    }
    return faces
  },
  generateRandom (count: number, offsetX = 0, offsetZ = 0, yOffset = 0, model = 0) {
    const square = Math.sqrt(count)
    if (square % 1 !== 0) throw new Error('square must be a whole number')
    const blocks = {} as Record<string, BlockType>
    for (let x = offsetX; x < square + offsetX; x++) {
      for (let z = offsetZ; z < square + offsetZ; z++) {
        blocks[`${x},${yOffset},${z}`] = {
          visibleFaces: [0, 1, 2, 3, 4, 5],
          modelId: model || Math.floor(Math.random() * 3000),
          block: '',
        } satisfies BlockType
      }
    }
    // console.log('generated random data:', count)
    this.addBlocksSection(blocks, `${offsetX},${yOffset},${offsetZ}`)
  },
  addAddBlocksFlat (positions: number[]) {
    const chunks = new Map<string, any>()
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]

      const xChunk = Math.floor(x / 16) * 16
      const zChunk = Math.floor(z / 16) * 16
      const key = `${xChunk},${0},${zChunk}`
      if (!chunks.has(key)) chunks.set(key, {})
      chunks.get(key)![`${x},${y},${z}`] = {
        faces: this.getFaces()
      }
    }
    for (const [key, value] of chunks) {
      this.addBlocksSection(value, key)
    }
  },
  addBlocksSection (tiles: Record<string, BlockType>, key: string, updateData = true) {
    chunksStorage.addChunk(tiles, key)
  },
  addBlocksSectionDone () {
  },
  updateTexture (imageBlob: Blob) {
    if (!webgpuRenderer) return
    void webgpuRenderer.updateTexture(imageBlob)
  },
  removeBlocksSection (key) {
    chunksStorage.removeChunk(key)
  },
  camera (newCam: { rotation: { x: number, y: number, z: number }, position: { x: number, y: number, z: number }, fov: number }) {
    // if (webgpuRenderer?.isPlayground) {
    //     camera.rotation.order = 'ZYX'
    //     new tweenJs.Tween(camera.rotation).to({ x: newCam.rotation.x, y: newCam.rotation.y, z: newCam.rotation.z }, 50).start()
    // } else {
    camera.rotation.set(newCam.rotation.x, newCam.rotation.y, newCam.rotation.z, 'ZYX')
    // }
    if (newCam.position.x === 0 && newCam.position.y === 0 && newCam.position.z === 0) {
      // initial camera position
      camera.position.set(newCam.position.x, newCam.position.y, newCam.position.z)
    } else {
      new tweenJs.Tween(camera.position).to({ x: newCam.position.x, y: newCam.position.y, z: newCam.position.z }, 50).start()
    }

    if (newCam.fov !== camera.fov) {
      camera.fov = newCam.fov
      camera.updateProjectionMatrix()
    }
  },
  animationTick (frames, tick) {
    if (frames <= 0) {
      autoTickUpdate = undefined
      animationTick = 0
      return
    }
    if (tick === -1) {
      autoTickUpdate = frames
    } else {
      autoTickUpdate = undefined
      animationTick = tick % 20 // todo update automatically in worker
    }
  },
  fullDataReset () {
    if (chunksStorage.chunksMap.size) {
      console.warn('fullReset: chunksMap not empty', chunksStorage.chunksMap)
    }
    // todo clear existing ranges with limit
    chunksStorage.clearData()
  },
  exportData () {
    const exported = exportData()
    // postMessage({ type: 'exportData', data: exported }, undefined as any, [exported.sides.buffer])
  },
  loadFixture (json) {
    // allSides = json.map(([x, y, z, face, textureIndex]) => {
    //     return [x, y, z, { face, textureIndex }] as [number, number, number, BlockFaceType]
    // })
    // const dataSize = json.length / 5
    // for (let i = 0; i < json.length; i += 5) {
    //   chunksStorage.allSides.push([json[i], json[i + 1], json[i + 2], { side: json[i + 3], textureIndex: json[i + 4] }])
    // }
    // updateCubesWhenAvailable(0)
  },
  updateBackground (color) {
    onceRendererAvailable((renderer) => {
      renderer.changeBackgroundColor(color)
    }, 'updateBackground')
  },
  destroy () {
    chunksStorage.clearData()
    webgpuRenderer?.destroy()
  }
}, globalThis.webgpuRendererChannel?.port2)

// globalThis.testDuplicates = () => {
//   const duplicates = [...chunksStorage.getDataForBuffers().allSides].flat().filter((value, index, self) => self.indexOf(value) !== index)
//   console.log('duplicates', duplicates)
// }

const exportData = () => {
  // const allSides = [...chunksStorage.getDataForBuffers().allSides].flat()

  // // Calculate the total length of the final array
  // const totalLength = allSides.length * 5

  // // Create a new Int16Array with the total length
  // const flatData = new Int16Array(totalLength)

  // // Fill the flatData array
  // for (const [i, sideData] of allSides.entries()) {
  //   if (!sideData) continue
  //   const [x, y, z, side] = sideData
  //   // flatData.set([x, y, z, side.side, side.textureIndex], i * 5)
  // }

  // return { sides: flatData }
}

setInterval(() => {
  if (autoTickUpdate) {
    animationTick = (animationTick + 1) % autoTickUpdate
  }
}, 1000 / 20)
