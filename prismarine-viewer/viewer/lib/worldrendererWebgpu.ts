import { Vec3 } from 'vec3'
// import { addBlocksSection, addWebgpuListener, webgpuChannel } from '../../examples/webgpuRendererMain'
import { pickObj } from '@zardoy/utils'
import { GUI } from 'lil-gui'
import type { WebglData } from '../prepare/webglData'
import { prepareCreateWebgpuBlocksModelsData } from '../../examples/webgpuBlockModels'
import type { workerProxyType } from '../../examples/webgpuRendererWorker'
import { useWorkerProxy } from '../../examples/workerProxy'
import { defaultWebgpuRendererParams, rendererParamsGui } from '../../examples/webgpuRendererShared'
import { loadJSON } from './utils.web'
import { WorldRendererCommon, WorldRendererConfig } from './worldrendererCommon'
import { MesherGeometryOutput } from './mesher/shared'
import { addNewStat, addNewStat2, updateStatText } from './ui/newStats'
import { isMobile } from './simpleUtils'

export class WorldRendererWebgpu extends WorldRendererCommon {
  outputFormat = 'webgpu' as const
  stopBlockUpdate = false
  allowUpdates = true
  rendering = true
  issueReporter = new RendererProblemReporter()
  abortController = new AbortController()
  worker: Worker | MessagePort | undefined
  _readyPromise = Promise.withResolvers()
  _readyWorkerPromise = Promise.withResolvers()
  readyPromise = this._readyPromise.promise
  readyWorkerPromise = this._readyWorkerPromise.promise
  postRender = () => {}
  preRender = () => {}
  rendererParams = defaultWebgpuRendererParams
  initCalled = false

  webgpuChannel: typeof workerProxyType['__workerProxy'] = this.getPlaceholderChannel()
  rendererDevice = '...'
  powerPreference: string | undefined

  constructor (config: WorldRendererConfig, { powerPreference } = {} as any) {
    super(config)
    this.powerPreference = powerPreference

    void this.readyWorkerPromise.then(() => {
      this.addWebgpuListener('rendererProblem', (data) => {
        this.issueReporter.reportProblem(data.isContextLost, data.message)
      })
    })

    this.renderUpdateEmitter.on('update', () => {
      const loadedChunks = Object.keys(this.finishedChunks).length
      updateStatText('loaded-chunks', `${loadedChunks}/${this.chunksLength} chunks (${this.lastChunkDistance}/${this.viewDistance})`)
    })
  }

  destroy () {
    this.abortController.abort()
    this.webgpuChannel.destroy() // still needed in case if running in the same thread
    if (this.worker instanceof Worker) {
      this.worker.terminate()
    }
  }

  getPlaceholderChannel () {
    return new Proxy({}, {
      get: (target, p) => (...args) => {
        void this.readyWorkerPromise.then(() => {
          this.webgpuChannel[p](...args)
        })
      }
    }) as any // placeholder to avoid crashes
  }

  updateRendererParams (params: Partial<typeof defaultWebgpuRendererParams>) {
    this.rendererParams = { ...this.rendererParams, ...params }
    this.webgpuChannel.updateConfig(this.rendererParams)
  }

  sendCameraToWorker () {
    const cameraVectors = ['rotation', 'position'].reduce((acc, key) => {
      acc[key] = ['x', 'y', 'z'].reduce((acc2, key2) => {
        acc2[key2] = this.camera[key][key2]
        return acc2
      }, {})
      return acc
    }, {}) as any
    this.webgpuChannel.camera({
      ...cameraVectors,
      fov: this.camera.fov
    })
  }

  addWebgpuListener (type: string, listener: (data: any) => void) {
    void this.readyWorkerPromise.then(() => {
      this.worker!.addEventListener('message', (e: any) => {
        if (e.data.type === type) {
          listener(e.data)
        }
      })
    })
  }

  override async setVersion (version, texturesVersion = version): Promise<any> {
    return Promise.all([
      super.setVersion(version, texturesVersion),
      this.readyPromise
    ])
  }

  setBlockStateId (pos: any, stateId: any): void {
    if (this.stopBlockUpdate) return
    super.setBlockStateId(pos, stateId)
  }

  sendDataForWebgpuRenderer (data) {
    for (const worker of this.workers) {
      worker.postMessage({ type: 'webgpuData', data })
    }
  }

  isWaitingForChunksToRender = false

  override addColumn (x: number, z: number, data: any, _): void {
    if (this.initialChunksLoad) {
      this.updateRendererParams({
        cameraOffset: [0, this.worldMinYRender < 0 ? Math.abs(this.worldMinYRender) : 0, 0]
      })
    }
    super.addColumn(x, z, data, _)
  }

  allChunksLoaded (): void {
    console.log('allChunksLoaded')
    this.webgpuChannel.addBlocksSectionDone()
  }

  handleWorkerMessage (data: { geometry: MesherGeometryOutput, type, key }): void {
    if (data.type === 'geometry' && Object.keys(data.geometry.tiles).length) {
      this.addChunksToScene(data.key, data.geometry)
    }
  }

  addChunksToScene (key: string, geometry: MesherGeometryOutput) {
    if (this.finishedChunks[key] && !this.allowUpdates) return
    // const chunkCoords = key.split(',').map(Number) as [number, number, number]
    if (/* !this.loadedChunks[chunkCoords[0] + ',' + chunkCoords[2]] ||  */ !this.active) return

    this.webgpuChannel.addBlocksSection(geometry.tiles, key, !this.finishedSections[key])
  }

  updateCamera (pos: Vec3 | null, yaw: number, pitch: number): void {
    if (pos) {
      // new tweenJs.Tween(this.camera.position).to({ x: pos.x, y: pos.y, z: pos.z }, 50).start()
      this.camera.position.set(pos.x, pos.y, pos.z)
    }
    this.camera.rotation.set(pitch, yaw, 0, 'ZYX')
    this.sendCameraToWorker()
  }
  render (): void { }

  chunksReset () {
    this.webgpuChannel.fullDataReset()
  }

  updatePosDataChunk (key: string) {
  }

  async updateTexturesData (resourcePackUpdate = false): Promise<void> {
    const { blocksDataModelDebug: blocksDataModelBefore, interestedTextureTiles } = prepareCreateWebgpuBlocksModelsData()
    await super.updateTexturesData(undefined, [...interestedTextureTiles].map(x => x.replace('block/', '')))
    const { blocksDataModel, blocksDataModelDebug, allBlocksStateIdToModelIdMap } = prepareCreateWebgpuBlocksModelsData()
    // this.webgpuChannel.updateModels(blocksDataModel)
    this.sendDataForWebgpuRenderer({ allBlocksStateIdToModelIdMap })
    void this.initWebgpu(blocksDataModel)
    if (resourcePackUpdate) {
      const blob = await fetch(this.material.map!.image.src).then(async (res) => res.blob())
      this.webgpuChannel.updateTexture(blob)
    }
  }

  updateShowChunksBorder (value: boolean) {
    // todo
  }

  changeBackgroundColor (color: [number, number, number]) {
    this.webgpuChannel.updateBackground(color)
  }

  setHighlightCursorBlock (position: typeof this.cursorBlock): void {
    const useChangeWorker = true
    if (this.cursorBlock) {
      const worker = this.workers[this.getWorkerNumber(this.cursorBlock, useChangeWorker)]
      worker.postMessage({ type: 'specialBlockState', data: { value: null, position: this.cursorBlock } })
      this.setSectionDirty(this.cursorBlock, true, useChangeWorker)
    }

    this.cursorBlock = position
    if (this.cursorBlock) {
      const worker = this.workers[this.getWorkerNumber(this.cursorBlock, useChangeWorker)]
      worker.postMessage({ type: 'specialBlockState', data: { value: 'highlight', position: this.cursorBlock } })
      this.setSectionDirty(this.cursorBlock, true, useChangeWorker)
    }
  }


  removeColumn (x, z) {
    console.log('removeColumn', x, z)
    super.removeColumn(x, z)

    for (let y = this.worldConfig.minY; y < this.worldConfig.worldHeight; y += 16) {
      this.webgpuChannel.removeBlocksSection(`${x},${y},${z}`)
    }
  }

  async initWebgpu (blocksDataModel) {
    if (this.initCalled) return
    this.initCalled = true
    // do not use worker in safari, it is bugged
    const USE_WORKER = defaultWebgpuRendererParams.webgpuWorker

    const playground = this.config.isPlayground
    const { image } = (this.material.map!)
    const imageBlob = await fetch(image.src).then(async (res) => res.blob())

    const existingCanvas = document.getElementById('viewer-canvas')
    existingCanvas?.remove()
    const canvas = document.createElement('canvas')
    canvas.width = window.innerWidth * window.devicePixelRatio
    canvas.height = window.innerHeight * window.devicePixelRatio
    document.body.appendChild(canvas)
    canvas.id = 'viewer-canvas'


    // replacable by initWebglRenderer
    if (USE_WORKER) {
      this.worker = new Worker('./webgpuRendererWorker.js')
      console.log('starting offscreen')
    } else if (globalThis.webgpuRendererChannel) {
      this.worker = globalThis.webgpuRendererChannel.port1 as MessagePort
    } else {
      const messageChannel = new MessageChannel()
      globalThis.webgpuRendererChannel = messageChannel
      this.worker = messageChannel.port1
      messageChannel.port1.start()
      messageChannel.port2.start()
      await import('../../examples/webgpuRendererWorker')
    }
    addWebgpuDebugUi(this.worker, playground)
    this.webgpuChannel = useWorkerProxy<typeof workerProxyType>(this.worker, true)
    this._readyWorkerPromise.resolve(undefined)
    this.webgpuChannel.canvas(
      canvas.transferControlToOffscreen(),
      imageBlob,
      playground,
      pickObj(localStorage, 'vertShader', 'fragShader', 'computeShader'),
      blocksDataModel,
      { powerPreference: this.powerPreference as GPUPowerPreference }
    )

    if (!USE_WORKER) {
    // wait for the .canvas() message to be processed (it's async since we still use message channel)
      await new Promise(resolve => {
        setTimeout(resolve, 0)
      })
    }

    let oldWidth = window.innerWidth
    let oldHeight = window.innerHeight
    let focused = true
    const { signal } = this.abortController
    window.addEventListener('focus', () => {
      focused = true
      this.webgpuChannel.startRender()
    }, { signal })
    window.addEventListener('blur', () => {
      focused = false
      this.webgpuChannel.stopRender()
    }, { signal })
    const mainLoop = () => {
      if (this.abortController.signal.aborted) return
      requestAnimationFrame(mainLoop)
      if (!focused || window.stopRender) return

      if (oldWidth !== window.innerWidth || oldHeight !== window.innerHeight) {
        oldWidth = window.innerWidth
        oldHeight = window.innerHeight
        this.webgpuChannel.resize(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio)
      }
      this.preRender()
      this.postRender()
      this.sendCameraToWorker()
    }

    requestAnimationFrame(mainLoop)

    this._readyPromise.resolve(undefined)
  }
}

class RendererProblemReporter {
  dom = document.createElement('div')
  contextlostDom = document.createElement('div')
  mainIssueDom = document.createElement('div')

  constructor () {
    document.body.appendChild(this.dom)
    this.dom.className = 'renderer-problem-reporter'
    this.dom.appendChild(this.contextlostDom)
    this.dom.appendChild(this.mainIssueDom)
    this.dom.style.fontFamily = 'monospace'
    this.dom.style.fontSize = '20px'
    this.contextlostDom.style.cssText = `
      position: fixed;
      top: 60px;
      left: 0;
      right: 0;
      color: red;
      display: flex;
      justify-content: center;
      z-index: -1;
      font-size: 18px;
      text-align: center;
    `
    this.mainIssueDom.style.cssText = `
      position: fixed;
      inset: 0;
      color: red;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: -1;
      text-align: center;
    `
    this.reportProblem(false, 'Waiting for renderer...')
    this.mainIssueDom.style.color = 'white'
  }

  reportProblem (isContextLost: boolean, message: string) {
    this.mainIssueDom.style.color = 'red'
    if (isContextLost) {
      this.contextlostDom.textContent = `Renderer context lost (try restarting the browser): ${message}`
    } else {
      this.mainIssueDom.textContent = message
    }
  }
}

const addWebgpuDebugUi = (worker, isPlayground) => {
  // todo destroy
  const mobile = isMobile()
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
    if (e.data.type === 'stats') {
      updateTextGpuStats(e.data.stats)
      viewer.world.rendererDevice = e.data.device
    }
  })

  const { updateText: updateText2 } = addNewStat('fps-main', 90, 0, 20)
  const { updateText: updateTextGpuStats } = addNewStat('gpu-stats', 90, 0, 40)
  const leftUi = isPlayground ? 130 : mobile ? 25 : 0
  const { updateText: updateTextBuild } = addNewStat2('build-info', {
    left: leftUi,
    displayOnlyWhenWider: 700,
  })
  updateTextBuild(`WebGPU Renderer Demo by @SA2URAMI. Build: ${process.env.NODE_ENV === 'development' ? 'dev' : process.env.RELEASE_TAG}`)
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

  if (!isPlayground) {
    const gui = new GUI()
    gui.domElement.classList.add('webgpu-debug-ui')
    gui.title('WebGPU Params')
    gui.open(false)
    setTimeout(() => {
      gui.open(false)
    }, 500)
    for (const rendererParam of Object.entries(viewer.world.rendererParams)) {
      const [key, value] = rendererParam
      if (!rendererParamsGui[key]) continue
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      gui.add(viewer.world.rendererParams, key).onChange((newVal) => {
        viewer.world.updateRendererParams({ [key]: newVal })
        if (rendererParamsGui[key]?.qsReload) {
          const searchParams = new URLSearchParams(window.location.search)
          searchParams.set(key, String(value))
          window.location.search = searchParams.toString()
        }
      })
    }
  }
}
