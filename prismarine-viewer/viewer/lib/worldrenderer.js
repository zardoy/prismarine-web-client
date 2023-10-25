//@ts-check
const THREE = require('three')
const { Vec3 } = require('vec3')
const { loadTexture, loadJSON } = globalThis.isElectron ? require('./utils.electron.js') : require('./utils')
const { EventEmitter } = require('events')
const mcDataRaw = require('minecraft-data/data.js')
const nbt = require('prismarine-nbt')
const { dynamicMcDataFiles } = require('../../buildWorkerConfig.mjs')
const { dispose3 } = require('./dispose')
const { toMajor } = require('./version.js')
const PrismarineChatLoader = require('prismarine-chat')
const { renderSign } = require('../sign-renderer/')

function mod (x, n) {
  return ((x % n) + n) % n
}

class WorldRenderer {
  constructor (scene, numWorkers = 4) {
    this.blockEntities = {}
    this.worldConfig = { minY: 0, worldHeight: 256 }
    this.sectionObjects = {}
    this.showChunkBorders = false
    this.active = false
    this.version = undefined
    /** @type {THREE.Scene} */
    this.scene = scene
    this.loadedChunks = {}
    this.sectionsOutstanding = new Set()
    this.renderUpdateEmitter = new EventEmitter()
    this.customBlockStatesData = undefined
    this.customTexturesDataUrl = undefined
    this.downloadedBlockStatesData = undefined
    this.downloadedTextureImage = undefined

    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, alphaTest: 0.1 })

    this.workers = []
    for (let i = 0; i < numWorkers; i++) {
      // Node environment needs an absolute path, but browser needs the url of the file
      let src = __dirname
      if (typeof window === 'undefined') src += '/worker.js'
      else src = 'worker.js'

      /** @type {any} */
      const worker = new Worker(src)
      worker.onmessage = async ({ data }) => {
        if (!this.active) return
        await new Promise(resolve => {
          setTimeout(resolve, 0)
        })
        if (data.type === 'geometry') {
          /** @type {THREE.Object3D} */
          let object = this.sectionObjects[data.key]
          if (object) {
            this.scene.remove(object)
            dispose3(object)
            delete this.sectionObjects[data.key]
          }

          const chunkCoords = data.key.split(',')
          if (!this.loadedChunks[chunkCoords[0] + ',' + chunkCoords[2]] || !data.geometry.positions.length) return

          const geometry = new THREE.BufferGeometry()
          geometry.setAttribute('position', new THREE.BufferAttribute(data.geometry.positions, 3))
          geometry.setAttribute('normal', new THREE.BufferAttribute(data.geometry.normals, 3))
          geometry.setAttribute('color', new THREE.BufferAttribute(data.geometry.colors, 3))
          geometry.setAttribute('uv', new THREE.BufferAttribute(data.geometry.uvs, 2))
          geometry.setIndex(data.geometry.indices)

          const mesh = new THREE.Mesh(geometry, this.material)
          mesh.position.set(data.geometry.sx, data.geometry.sy, data.geometry.sz)
          object = new THREE.Group()
          object.add(mesh)
          if (this.showChunkBorders) {
            const boxHelper = new THREE.BoxHelper(mesh, 0xffff00)
            object.add(boxHelper)
          }
          // should not it compute once
          if (Object.keys(data.geometry.signs).length) {
            for (const [posKey, { isWall, rotation }] of Object.entries(data.geometry.signs)) {
              const [x, y, z] = posKey.split(',')
              const signBlockEntity = this.blockEntities[posKey]
              if (!signBlockEntity) continue
              object.add(this.renderSign(new Vec3(+x, +y, +z), rotation, isWall, nbt.simplify(signBlockEntity)))
            }
          }
          this.sectionObjects[data.key] = object
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

  renderSign (/** @type {Vec3} */position, /** @type {number} */rotation, isWall, blockEntity) {
    // @ts-ignore
    const PrismarineChat = PrismarineChatLoader(this.version)
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
    loadTexture(this.customTexturesDataUrl || `textures/${this.texturesVersion}.png`, texture => {
      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter
      texture.flipY = false
      this.material.map = texture
      this.material.map.onUpdate = () => {
        this.downloadedTextureImage = this.material.map.image
      }
    })

    const loadBlockStates = async () => {
      return new Promise(resolve => {
        if (this.customBlockStatesData) return resolve(this.customBlockStatesData)
        return loadJSON(`blocksStates/${this.texturesVersion}.json`, (data) => {
          this.downloadedBlockStatesData = data
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

  addColumn (x, z, chunk) {
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
    return new Promise((resolve, reject) => {
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

module.exports = { WorldRenderer }
