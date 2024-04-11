import * as THREE from 'three'
import { Vec3 } from 'vec3'
import { loadJSON } from './utils'
import { loadTexture } from './utils.web'
import { EventEmitter } from 'events'
import mcDataRaw from 'minecraft-data/data.js'; // handled correctly in esbuild plugin
import { dynamicMcDataFiles } from '../../buildWorkerConfig.mjs'
import { toMajor } from './version.js'

function mod (x, n) {
  return ((x % n) + n) % n
}

export abstract class WorldRendererCommon<WorkerSend = any, WorkerReceive = any> {
  worldConfig = { minY: 0, worldHeight: 256 }
  // todo @sa2urami set alphaTest back to 0.1 and instead properly sort transparent and solid objects (needs to be done in worker too)
  material = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, alphaTest: 0.5 })

  showChunkBorders = false
  active = false
  version = undefined as string | undefined
  loadedChunks = {} as Record<string, boolean>
  sectionsOutstanding = new Set<string>()
  renderUpdateEmitter = new EventEmitter()
  customBlockStatesData = undefined as any
  customTexturesDataUrl = undefined as string | undefined
  downloadedBlockStatesData = undefined as any
  downloadedTextureImage = undefined as any
  workers: any[] = []
  viewerPosition?: Vec3
  lastCamUpdate = 0
  droppedFpsPercentage = 0
  initialChunksLoad = true
  enableChunksLoadDelay = false
  texturesVersion?: string
  // promisesQueue = [] as Promise<any>[]

  constructor(numWorkers: number) {
    // init workers
    for (let i = 0; i < numWorkers; i++) {
      // Node environment needs an absolute path, but browser needs the url of the file
      let src = __dirname
      if (typeof window === 'undefined') src += '/worker.js'
      else src = 'worker.js'

      const worker: any = new Worker(src)
      worker.onmessage = async ({ data }) => {
        if (!this.active) return
        this.handleWorkerMessage(data)
        await new Promise(resolve => {
          setTimeout(resolve, 0)
        })
        if (data.type === 'sectionFinished') {
          this.sectionsOutstanding.delete(data.key)
          this.renderUpdateEmitter.emit('update')
        }
      }
      if (worker.on) worker.on('message', (data) => { worker.onmessage({ data }) })
      this.workers.push(worker)
    }
  }

  abstract handleWorkerMessage (data: WorkerReceive): void

  /**
   * Optionally update data that are depedendent on the viewer position
   */
  abstract updatePosDataChunk (key: string): void

  updateViewerPosition (pos: Vec3) {
    this.viewerPosition = pos
    for (const [key, value] of Object.entries(this.loadedChunks)) {
      if (!value) continue
      this.updatePosDataChunk(key)
    }
  }

  sendWorkers (message: WorkerSend) {
    for (const worker of this.workers) {
      worker.postMessage(message)
    }
  }

  abstract updateShowChunksBorder (value: boolean): void

  resetWorld () {
    this.active = false
    this.loadedChunks = {}
    this.sectionsOutstanding = new Set()
    for (const worker of this.workers) {
      worker.postMessage({ type: 'reset' })
    }
  }

  setVersion (version, texturesVersion = version) {
    this.version = version
    this.texturesVersion = texturesVersion
    this.resetWorld()
    this.active = true

    const allMcData = mcDataRaw.pc[this.version] ?? mcDataRaw.pc[toMajor(this.version)]
    for (const worker of this.workers) {
      const mcData = Object.fromEntries(Object.entries(allMcData).filter(([key]) => dynamicMcDataFiles.includes(key)))
      mcData.version = JSON.parse(JSON.stringify(mcData.version))
      worker.postMessage({ type: 'mcData', mcData, version: this.version })
    }

    this.updateTexturesData()
  }

  updateTexturesData () {
    loadTexture(this.customTexturesDataUrl || `textures/${this.texturesVersion}.png`, (texture: import('three').Texture) => {
      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter
      texture.flipY = false
      this.material.map = texture
    }, (tex) => {
      this.downloadedTextureImage = this.material.map!.image
      const loadBlockStates = async () => {
        return new Promise(resolve => {
          if (this.customBlockStatesData) return resolve(this.customBlockStatesData)
          return loadJSON(`/blocksStates/${this.texturesVersion}.json`, (data) => {
            this.downloadedBlockStatesData = data
            // todo
            this.renderUpdateEmitter.emit('blockStatesDownloaded')
            resolve(data)
          })
        })
      }
      loadBlockStates().then((blockStates) => {
        for (const worker of this.workers) {
          worker.postMessage({ type: 'blockStates', json: blockStates, textureSize: tex.image.width })
        }
      })
    })

  }

  addColumn (x, z, chunk) {
    this.initialChunksLoad = false
    this.loadedChunks[`${x},${z}`] = true
    for (const worker of this.workers) {
      worker.postMessage({ type: 'chunk', x, z, chunk })
    }
    for (let y = this.worldConfig.minY; y < this.worldConfig.worldHeight; y += 16) {
      const loc = new Vec3(x, y, z)
      this.setSectionDirty(loc)
      this.setSectionDirty(loc.offset(-16, 0, 0))
      this.setSectionDirty(loc.offset(16, 0, 0))
      this.setSectionDirty(loc.offset(0, 0, -16))
      this.setSectionDirty(loc.offset(0, 0, 16))
    }
  }

  removeColumn (x, z) {
    delete this.loadedChunks[`${x},${z}`]
    for (const worker of this.workers) {
      worker.postMessage({ type: 'unloadChunk', x, z })
    }
  }

  setBlockStateId (pos, stateId) {
    for (const worker of this.workers) {
      worker.postMessage({ type: 'blockUpdate', pos, stateId })
    }
    this.setSectionDirty(pos)
    if ((pos.x & 15) === 0) this.setSectionDirty(pos.offset(-16, 0, 0))
    if ((pos.x & 15) === 15) this.setSectionDirty(pos.offset(16, 0, 0))
    if ((pos.y & 15) === 0) this.setSectionDirty(pos.offset(0, -16, 0))
    if ((pos.y & 15) === 15) this.setSectionDirty(pos.offset(0, 16, 0))
    if ((pos.z & 15) === 0) this.setSectionDirty(pos.offset(0, 0, -16))
    if ((pos.z & 15) === 15) this.setSectionDirty(pos.offset(0, 0, 16))
  }

  setSectionDirty (pos, value = true) {
    this.renderUpdateEmitter.emit('dirty', pos, value)
    // Dispatch sections to workers based on position
    // This guarantees uniformity accross workers and that a given section
    // is always dispatched to the same worker
    const hash = mod(Math.floor(pos.x / 16) + Math.floor(pos.y / 16) + Math.floor(pos.z / 16), this.workers.length)
    this.workers[hash].postMessage({ type: 'dirty', x: pos.x, y: pos.y, z: pos.z, value })
    this.sectionsOutstanding.add(`${Math.floor(pos.x / 16) * 16},${Math.floor(pos.y / 16) * 16},${Math.floor(pos.z / 16) * 16}`)
  }

  // Listen for chunk rendering updates emitted if a worker finished a render and resolve if the number
  // of sections not rendered are 0
  async waitForChunksToRender () {
    return new Promise<void>((resolve, reject) => {
      if ([...this.sectionsOutstanding].length === 0) {
        resolve()
        return
      }

      const updateHandler = () => {
        if (this.sectionsOutstanding.size === 0) {
          this.renderUpdateEmitter.removeListener('update', updateHandler)
          resolve()
        }
      }
      this.renderUpdateEmitter.on('update', updateHandler)
    })
  }
}
