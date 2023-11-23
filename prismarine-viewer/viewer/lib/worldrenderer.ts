import * as THREE from 'three'
import { Vec3 } from 'vec3'
import { loadTexture, loadJSON } from './utils'
import { EventEmitter } from 'events'
import mcDataRaw from 'minecraft-data/data.js' // handled correctly in esbuild plugin
import nbt from 'prismarine-nbt'
import { dynamicMcDataFiles } from '../../buildWorkerConfig.mjs'
import { dispose3 } from './dispose'
import { toMajor } from './version.js'
import PrismarineChatLoader from 'prismarine-chat'
import { renderSign } from '../sign-renderer/'
import { chunkPos } from './simpleUtils'

function mod (x, n) {
  return ((x % n) + n) % n
}

export class WorldRenderer {
  worldConfig = { minY: 0, worldHeight: 256 }
  material = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, alphaTest: 0.1 })

  blockEntities = {}
  sectionObjects: Record<string, THREE.Object3D> = {}
  showChunkBorders = false
  active = false
  version = undefined as string | undefined
  loadedChunks = {}
  sectionsOutstanding = new Set()
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

  promisesQueue = [] as Promise<any>[]

  constructor(public scene: THREE.Scene, numWorkers = 4) {
    // init workers
    for (let i = 0; i < numWorkers; i++) {
      // Node environment needs an absolute path, but browser needs the url of the file
      let src = __dirname
      if (typeof window === 'undefined') src += '/worker.js'
      else src = 'worker.js'

      const worker: any = new Worker(src)
      worker.onmessage = async ({ data }) => {
        if (!this.active) return
        await new Promise(resolve => {
          setTimeout(resolve, 0)
        })
        if (data.type === 'geometry') {
          let object: THREE.Object3D = this.sectionObjects[data.key]
          if (object) {
            this.scene.remove(object)
            dispose3(object)
            delete this.sectionObjects[data.key]
          }

          const chunkCoords = data.key.split(',')
          if (!this.loadedChunks[chunkCoords[0] + ',' + chunkCoords[2]] || !data.geometry.positions.length || !this.active) return

          // if (!this.initialChunksLoad && this.enableChunksLoadDelay) {
          //   const newPromise = new Promise(resolve => {
          //     if (this.droppedFpsPercentage > 0.5) {
          //       setTimeout(resolve, 1000 / 50 * this.droppedFpsPercentage)
          //     } else {
          //       setTimeout(resolve)
          //     }
          //   })
          //   this.promisesQueue.push(newPromise)
          //   for (const promise of this.promisesQueue) {
          //     await promise
          //   }
          // }

          const geometry = new THREE.BufferGeometry()
          geometry.setAttribute('position', new THREE.BufferAttribute(data.geometry.positions, 3))
          geometry.setAttribute('normal', new THREE.BufferAttribute(data.geometry.normals, 3))
          geometry.setAttribute('color', new THREE.BufferAttribute(data.geometry.colors, 3))
          geometry.setAttribute('uv', new THREE.BufferAttribute(data.geometry.uvs, 2))
          geometry.setIndex(data.geometry.indices)

          const mesh = new THREE.Mesh(geometry, this.material)
          mesh.position.set(data.geometry.sx, data.geometry.sy, data.geometry.sz)
          mesh.name = 'mesh'
          object = new THREE.Group()
          object.add(mesh)
          const boxHelper = new THREE.BoxHelper(mesh, 0xffff00)
          boxHelper.name = 'helper'
          object.add(boxHelper)
          object.name = 'chunk'
          if (!this.showChunkBorders) {
            boxHelper.visible = false
          }
          // should not compute it once
          if (Object.keys(data.geometry.signs).length) {
            for (const [posKey, { isWall, rotation }] of Object.entries(data.geometry.signs)) {
              const [x, y, z] = posKey.split(',')
              const signBlockEntity = this.blockEntities[posKey]
              if (!signBlockEntity) continue
              object.add(this.renderSign(new Vec3(+x, +y, +z), rotation, isWall, nbt.simplify(signBlockEntity)))
            }
          }
          this.sectionObjects[data.key] = object
          this.updatePosDataChunk(data.key)
          this.scene.add(object)
        } else if (data.type === 'sectionFinished') {
          this.sectionsOutstanding.delete(data.key)
          this.renderUpdateEmitter.emit('update')
        }
      }
      if (worker.on) worker.on('message', (data) => { worker.onmessage({ data }) })
      this.workers.push(worker)
    }
  }

  /**
   * Optionally update data that are depedendent on the viewer position
   */
  updatePosDataChunk (key: string) {
    if (!this.viewerPosition) return
    const [x, y, z] = key.split(',').map(x => Math.floor(+x / 16))
    const [xPlayer, yPlayer, zPlayer] = this.viewerPosition.toArray().map(x => Math.floor(x / 16))
    // sum of distances: x + y + z
    const chunkDistance = Math.abs(x - xPlayer) + Math.abs(y - yPlayer) + Math.abs(z - zPlayer)
    const section = this.sectionObjects[key].children.find(child => child.name === 'mesh')!
    section.renderOrder = 500 - chunkDistance
  }

  updateViewerPosition (pos: Vec3) {
    this.viewerPosition = pos
    for (const key of Object.keys(this.sectionObjects)) {
      this.updatePosDataChunk(key)
    }
  }

  renderSign (position: Vec3, rotation: number, isWall: boolean, blockEntity) {
    const PrismarineChat = PrismarineChatLoader(this.version!)
    const canvas = renderSign(blockEntity, PrismarineChat)
    const tex = new THREE.Texture(canvas)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    tex.needsUpdate = true
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, }))
    mesh.renderOrder = 999

    // todo @sa2urami shouldnt all this be done in worker?
    mesh.scale.set(1, 7 / 16, 1)
    if (isWall) {
      mesh.position.set(0, 0, -(8 - 1.5) / 16 + 0.001)
    } else {
      // standing
      const faceEnd = 8.75
      mesh.position.set(0, 0, (faceEnd - 16 / 2) / 16 + 0.001)
    }

    const group = new THREE.Group()
    group.rotation.set(0, -THREE.MathUtils.degToRad(
      rotation * (isWall ? 90 : 45 / 2)
    ), 0)
    group.add(mesh)
    const y = isWall ? 4.5 / 16 + mesh.scale.y / 2 : (1 - (mesh.scale.y / 2))
    group.position.set(position.x + 0.5, position.y + y, position.z + 0.5)
    return group
  }

  updateShowChunksBorder (value: boolean) {
    this.showChunkBorders = value
    for (const object of Object.values(this.sectionObjects)) {
      for (const child of object.children) {
        if (child.name === 'helper') {
          child.visible = value
        }
      }
    }
  }

  resetWorld () {
    this.active = false
    for (const mesh of Object.values(this.sectionObjects)) {
      this.scene.remove(mesh)
    }
    this.sectionObjects = {}
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
      this.material.map.onUpdate = () => {
        this.downloadedTextureImage = this.material.map!.image
      }
    })

    const loadBlockStates = async () => {
      return new Promise(resolve => {
        if (this.customBlockStatesData) return resolve(this.customBlockStatesData)
        return loadJSON(`blocksStates/${this.texturesVersion}.json`, (data) => {
          this.downloadedBlockStatesData = data
          // todo
          this.renderUpdateEmitter.emit('blockStatesDownloaded')
          resolve(data)
        })
      })
    }
    loadBlockStates().then((blockStates) => {
      for (const worker of this.workers) {
        worker.postMessage({ type: 'blockStates', json: blockStates })
      }
    })
  }

  getLoadedChunksRelative (pos: Vec3) {
    const [currentX, currentZ] = chunkPos(pos)
    return Object.fromEntries(Object.entries(this.sectionObjects).map(([key, o]) => {
      const [xRaw, yRaw, zRaw] = key.split(',').map(Number)
      const [x, z] = chunkPos({ x: xRaw, z: zRaw })
      return [`${x - currentX},${z - currentZ}`, o]
    }))
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
    for (let y = this.worldConfig.minY; y < this.worldConfig.worldHeight; y += 16) {
      this.setSectionDirty(new Vec3(x, y, z), false)
      const key = `${x},${y},${z}`
      const mesh = this.sectionObjects[key]
      if (mesh) {
        this.scene.remove(mesh)
        dispose3(mesh)
      }
      delete this.sectionObjects[key]
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
