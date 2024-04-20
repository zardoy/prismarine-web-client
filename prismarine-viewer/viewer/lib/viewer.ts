import * as THREE from 'three'
import { Vec3 } from 'vec3'
import { Entities } from './entities'
import { Primitives } from './primitives'
import { getVersion } from './version'
import EventEmitter from 'events'
import { WorldRendererThree } from './worldrendererThree'
import { generateSpiralMatrix } from 'flying-squid/dist/utils'
import { WorldRendererCommon, WorldRendererConfig, defaultWorldRendererConfig } from './worldrendererCommon'

export class Viewer {
  scene: THREE.Scene
  ambientLight: THREE.AmbientLight
  directionalLight: THREE.DirectionalLight
  camera: THREE.PerspectiveCamera
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

  constructor(public renderer: THREE.WebGLRenderer, worldConfig = defaultWorldRendererConfig) {
    // https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791
    THREE.ColorManagement.enabled = false
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace

    this.scene = new THREE.Scene()
    this.scene.matrixAutoUpdate = false // for perf
    this.resetScene()
    this.threeJsWorld = new WorldRendererThree(this.scene, this.renderer, this.camera, worldConfig)
    this.setWorld()
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

  setVersion (userVersion: string) {
    const texturesVersion = getVersion(userVersion)
    console.log('[viewer] Using version:', userVersion, 'textures:', texturesVersion)
    this.world.setVersion(userVersion, texturesVersion)
    this.entities.clear()
    // this.primitives.clear()
  }

  addColumn (x, z, chunk) {
    this.world.addColumn(x, z, chunk)
  }

  removeColumn (x: string, z: string) {
    this.world.removeColumn(x, z)
  }

  setBlockStateId (pos: Vec3, stateId: number) {
    this.world.setBlockStateId(pos, stateId)
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

    if (this.world instanceof WorldRendererThree) this.world.camera = cam as THREE.PerspectiveCamera
    this.world.updateCamera(pos?.offset(0, yOffset, 0) ?? null, yaw, pitch)
  }

  playSound (position: Vec3, path: string, volume = 1) {
    if (!this.audioListener) {
      this.audioListener = new THREE.AudioListener()
      this.camera.add(this.audioListener)
    }

    const sound = new THREE.PositionalAudio(this.audioListener)

    const audioLoader = new THREE.AudioLoader()
    let start = Date.now()
    audioLoader.loadAsync(path).then((buffer) => {
      if (Date.now() - start > 500) return
      // play
      sound.setBuffer(buffer)
      sound.setRefDistance(20)
      sound.setVolume(volume)
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

  // todo type
  listen (emitter: EventEmitter) {
    emitter.on('entity', (e) => {
      this.updateEntity(e)
    })

    emitter.on('primitive', (p) => {
      // this.updatePrimitive(p)
    })

    emitter.on('loadChunk', ({ x, z, chunk, worldConfig }) => {
      this.world.worldConfig = worldConfig
      this.addColumn(x, z, chunk)
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
      let skyLight = 15
      if (timeOfDay < 0 || timeOfDay > 24000) {
        throw new Error("Invalid time of day. It should be between 0 and 24000.")
      } else if (timeOfDay <= 6000 || timeOfDay >= 18000) {
        skyLight = 15
      } else if (timeOfDay > 6000 && timeOfDay < 12000) {
        skyLight = 15 - ((timeOfDay - 6000) / 6000) * 15
      } else if (timeOfDay >= 12000 && timeOfDay < 18000) {
        skyLight = ((timeOfDay - 12000) / 6000) * 15
      }

      skyLight = Math.floor(skyLight) // todo: remove this after optimization

      if (this.world.mesherConfig.skyLight === skyLight) return
      this.world.mesherConfig.skyLight = skyLight
        ; (this.world as WorldRendererThree).rerenderAllChunks?.()
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
