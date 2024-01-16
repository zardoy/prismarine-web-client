import * as THREE from 'three'
import * as tweenJs from '@tweenjs/tween.js'
import { Vec3 } from 'vec3'
import { WorldRenderer } from './worldrenderer'
import { Entities } from './entities'
import { Primitives } from './primitives'
import { getVersion } from './version'

export class Viewer {
  scene: THREE.Scene
  ambientLight: THREE.AmbientLight
  directionalLight: THREE.DirectionalLight
  camera: THREE.PerspectiveCamera
  world: WorldRenderer
  entities: Entities
  primitives: Primitives
  domElement: HTMLCanvasElement
  playerHeight = 1.62
  isSneaking = false
  version: string
  cameraObjectOverride?: THREE.Object3D // for xr
  audioListener: THREE.AudioListener
  renderingUntilNoUpdates = false
  processEntityOverrides = (e, overrides) => overrides

  constructor(public renderer: THREE.WebGLRenderer, numWorkers?: number) {
    this.resetScene()
    this.world = new WorldRenderer(this.scene, numWorkers)
    this.entities = new Entities(this.scene)
    this.primitives = new Primitives(this.scene, this.camera)

    this.domElement = renderer.domElement
  }

  resetScene () {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('lightblue')

    this.ambientLight = new THREE.AmbientLight(0xcc_cc_cc)
    this.scene.add(this.ambientLight)

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
    this.primitives.clear()
  }

  setVersion (userVersion: string) {
    const texturesVersion = getVersion(userVersion)
    console.log('[viewer] Using version:', userVersion, 'textures:', texturesVersion)
    this.version = userVersion
    this.world.setVersion(userVersion, texturesVersion)
    this.entities.clear()
    this.primitives.clear()
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
    this.entities.update(e)
  }

  updatePrimitive (p) {
    this.primitives.update(p)
  }

  setFirstPersonCamera (pos: Vec3 | null, yaw: number, pitch: number, roll = 0) {
    const cam = this.cameraObjectOverride || this.camera
    if (pos) {
      let y = pos.y + this.playerHeight
      if (this.isSneaking) y -= 0.3
      new tweenJs.Tween(cam.position).to({ x: pos.x, y, z: pos.z }, 50).start()
    }
    cam.rotation.set(pitch, yaw, roll, 'ZYX')
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
      sound.play()
      sound.onEnded = () => {
        this.scene.remove(sound)
        sound.disconnect()
      }
    })
  }

  // todo type
  listen (emitter) {
    emitter.on('entity', (e) => {
      this.updateEntity(e)
    })

    emitter.on('primitive', (p) => {
      this.updatePrimitive(p)
    })

    emitter.on('loadChunk', ({ x, z, chunk, worldConfig }) => {
      this.world.worldConfig = worldConfig
      this.addColumn(x, z, chunk)
    })
    // todo remove and use other architecture instead so data flow is clear
    emitter.on('blockEntities', (blockEntities) => {
      this.world.blockEntities = blockEntities
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

    emitter.emit('listening')

    this.domElement.addEventListener('pointerdown', (evt) => {
      const raycaster = new THREE.Raycaster()
      const mouse = new THREE.Vector2()
      mouse.x = (evt.clientX / this.domElement.clientWidth) * 2 - 1
      mouse.y = -(evt.clientY / this.domElement.clientHeight) * 2 + 1
      raycaster.setFromCamera(mouse, this.camera)
      const { ray } = raycaster
      emitter.emit('mouseClick', { origin: ray.origin, direction: ray.direction, button: evt.button })
    })
  }

  update () {
    tweenJs.update()
  }

  render () {
    this.renderer.render(this.scene, this.camera)
  }

  async waitForChunksToRender () {
    await this.world.waitForChunksToRender()
  }
}
