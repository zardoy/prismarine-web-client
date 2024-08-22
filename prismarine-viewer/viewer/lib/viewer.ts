import EventEmitter from 'events'
import * as THREE from 'three'
import { Vec3 } from 'vec3'
import { generateSpiralMatrix } from 'flying-squid/dist/utils'
import worldBlockProvider from 'mc-assets/dist/worldBlockProvider'
import { Entities } from './entities'
import { Primitives } from './primitives'
import { WorldRendererThree } from './worldrendererThree'
import { WorldRendererCommon, WorldRendererConfig, defaultWorldRendererConfig } from './worldrendererCommon'
import { renderBlockThree } from './mesher/standaloneRenderer'

export class Viewer {
  scene: THREE.Scene
  ambientLight: THREE.AmbientLight
  directionalLight: THREE.DirectionalLight
  world: WorldRendererCommon
  entities: Entities
  // primitives: Primitives
  domElement: HTMLCanvasElement
  playerHeight = 1.62
  isSneaking = false
  threeJsWorld: WorldRendererThree
  cameraObjectOverride?: THREE.Object3D // for xr
  audioListener: THREE.AudioListener
  renderingUntilNoUpdates = false
  processEntityOverrides = (e, overrides) => overrides

  get camera () {
    return this.world.camera
  }

  set camera (camera) {
    this.world.camera = camera
  }

  constructor (public renderer: THREE.WebGLRenderer, worldConfig = defaultWorldRendererConfig) {
    // https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791
    THREE.ColorManagement.enabled = false
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace

    this.scene = new THREE.Scene()
    this.scene.matrixAutoUpdate = false // for perf
    this.threeJsWorld = new WorldRendererThree(this.scene, this.renderer, worldConfig)
    this.setWorld()
    this.resetScene()
    this.entities = new Entities(this.scene)
    // this.primitives = new Primitives(this.scene, this.camera)

    this.domElement = renderer.domElement
  }

  setWorld () {
    this.world = this.threeJsWorld
  }

  resetScene () {
    this.scene.background = new THREE.Color('lightblue')

    if (this.ambientLight) this.scene.remove(this.ambientLight)
    this.ambientLight = new THREE.AmbientLight(0xcc_cc_cc)
    this.scene.add(this.ambientLight)

    if (this.directionalLight) this.scene.remove(this.directionalLight)
    this.directionalLight = new THREE.DirectionalLight(0xff_ff_ff, 0.5)
    this.directionalLight.position.set(1, 1, 0.5).normalize()
    this.directionalLight.castShadow = true
    this.scene.add(this.directionalLight)

    const size = this.renderer.getSize(new THREE.Vector2())
    this.camera = new THREE.PerspectiveCamera(75, size.x / size.y, 0.1, 1000)
  }

  resetAll () {
    this.resetScene()
    this.world.resetWorld()
    this.entities.clear()
    // this.primitives.clear()
  }

  setVersion (userVersion: string, texturesVersion = userVersion) {
    console.log('[viewer] Using version:', userVersion, 'textures:', texturesVersion)
    void this.world.setVersion(userVersion, texturesVersion).then(async () => {
      return new THREE.TextureLoader().loadAsync(this.world.itemsAtlasParser!.latestImage)
    }).then((texture) => {
      this.entities.itemsTexture = texture
    })
    this.entities.clear()
    // this.primitives.clear()
  }

  addColumn (x, z, chunk, isLightUpdate = false) {
    this.world.addColumn(x, z, chunk, isLightUpdate)
  }

  removeColumn (x: string, z: string) {
    this.world.removeColumn(x, z)
  }

  setBlockStateId (pos: Vec3, stateId: number) {
    this.world.setBlockStateId(pos, stateId)
  }

  demoModel () {
    const blockProvider = worldBlockProvider(this.world.blockstatesModels, this.world.blocksAtlases, 'latest')
    const models = blockProvider.getAllResolvedModels0_1({
      name: 'item_frame',
      properties: {
        map: false
      }
    })
    const geometry = renderBlockThree(models, undefined, 'plains', loadedData)
    const { material } = this.world
    // block material
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z)
    const helper = new THREE.BoxHelper(mesh, 0xff_ff_00)
    mesh.add(helper)
    this.scene.add(mesh)
  }

  updateEntity (e) {
    this.entities.update(e, this.processEntityOverrides(e, {
      rotation: {
        head: {
          x: e.headPitch ?? e.pitch,
          y: e.headYaw,
          z: 0
        }
      }
    }))
  }

  setFirstPersonCamera (pos: Vec3 | null, yaw: number, pitch: number, roll = 0) {
    const cam = this.cameraObjectOverride || this.camera
    let yOffset = this.playerHeight
    if (this.isSneaking) yOffset -= 0.3

    if (this.world instanceof WorldRendererThree) {
      this.world.camera = cam as THREE.PerspectiveCamera
    }
    this.world.updateCamera(pos?.offset(0, yOffset, 0) ?? null, yaw, pitch)
  }

  playSound (position: Vec3, path: string, volume = 1, pitch = 1) {
    if (!this.audioListener) {
      this.audioListener = new THREE.AudioListener()
      this.camera.add(this.audioListener)
    }

    const sound = new THREE.PositionalAudio(this.audioListener)

    const audioLoader = new THREE.AudioLoader()
    const start = Date.now()
    void audioLoader.loadAsync(path).then((buffer) => {
      if (Date.now() - start > 500) return
      // play
      sound.setBuffer(buffer)
      sound.setRefDistance(20)
      sound.setVolume(volume)
      sound.setPlaybackRate(pitch) // set the pitch
      this.scene.add(sound)
      // set sound position
      sound.position.set(position.x, position.y, position.z)
      sound.onEnded = () => {
        this.scene.remove(sound)
        sound.disconnect()
        audioLoader.manager.itemEnd(path)
      }
      sound.play()
    })
  }

  addChunksBatchWaitTime = 200

  // todo type
  listen (emitter: EventEmitter) {
    emitter.on('entity', (e) => {
      this.updateEntity(e)
    })

    emitter.on('primitive', (p) => {
      // this.updatePrimitive(p)
    })

    let currentLoadChunkBatch = null as {
      timeout
      data
    } | null
    emitter.on('loadChunk', ({ x, z, chunk, worldConfig, isLightUpdate }) => {
      this.world.worldConfig = worldConfig
      if (!currentLoadChunkBatch) {
        // add a setting to use debounce instead
        currentLoadChunkBatch = {
          data: [],
          timeout: setTimeout(() => {
            for (const args of currentLoadChunkBatch!.data) {
              //@ts-expect-error
              this.addColumn(...args)
            }
            currentLoadChunkBatch = null
          }, this.addChunksBatchWaitTime)
        }
      }
      currentLoadChunkBatch.data.push([x, z, chunk, isLightUpdate])
    })
    // todo remove and use other architecture instead so data flow is clear
    emitter.on('blockEntities', (blockEntities) => {
      if (this.world instanceof WorldRendererThree) this.world.blockEntities = blockEntities
    })

    emitter.on('unloadChunk', ({ x, z }) => {
      this.removeColumn(x, z)
    })

    emitter.on('blockUpdate', ({ pos, stateId }) => {
      this.setBlockStateId(new Vec3(pos.x, pos.y, pos.z), stateId)
    })

    emitter.on('chunkPosUpdate', ({ pos }) => {
      this.world.updateViewerPosition(pos)
    })

    emitter.on('renderDistance', (d) => {
      this.world.viewDistance = d
      this.world.chunksLength = d === 0 ? 1 : generateSpiralMatrix(d).length
      this.world.allChunksFinished = Object.keys(this.world.finishedChunks).length === this.world.chunksLength
    })

    emitter.on('updateLight', ({ pos }) => {
      if (this.world instanceof WorldRendererThree) this.world.updateLight(pos.x, pos.z)
    })

    emitter.on('time', (timeOfDay) => {
      this.world.timeUpdated?.(timeOfDay)

      let skyLight = 15
      if (timeOfDay < 0 || timeOfDay > 24_000) {
        throw new Error('Invalid time of day. It should be between 0 and 24000.')
      } else if (timeOfDay <= 6000 || timeOfDay >= 18_000) {
        skyLight = 15
      } else if (timeOfDay > 6000 && timeOfDay < 12_000) {
        skyLight = 15 - ((timeOfDay - 6000) / 6000) * 15
      } else if (timeOfDay >= 12_000 && timeOfDay < 18_000) {
        skyLight = ((timeOfDay - 12_000) / 6000) * 15
      }

      skyLight = Math.floor(skyLight) // todo: remove this after optimization

      if (this.world.mesherConfig.skyLight === skyLight) return
      this.world.mesherConfig.skyLight = skyLight;
      (this.world as WorldRendererThree).rerenderAllChunks?.()
    })

    emitter.emit('listening')
  }

  render () {
    this.world.render()
    this.entities.render()
  }

  async waitForChunksToRender () {
    await this.world.waitForChunksToRender()
  }
}
