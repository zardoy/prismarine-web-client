import * as THREE from 'three'
import * as tweenJs from '@tweenjs/tween.js'
import { Vec3 } from 'vec3'
import { WorldRenderer } from './worldrenderer'
import { Entities } from './entities'
import { Primitives } from './primitives'
import { getVersion } from './version'

// new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial())

export class Viewer {
  scene: THREE.Scene
  ambientLight: THREE.AmbientLight
  directionalLight: THREE.DirectionalLight
  camera: THREE.PerspectiveCamera
  world: WorldRenderer
  entities: Entities
  primitives: Primitives
  domElement: HTMLCanvasElement
  playerHeight: number
  isSneaking: boolean
  version: string
  cameraObjectOverride?: THREE.Object3D // for xr
  /** default sky color */
  skyColour = new THREE.Color('lightblue')

  constructor(public renderer: THREE.WebGLRenderer, numWorkers?: number) {
    this.scene = new THREE.Scene()
    this.scene.background = this.skyColour

    this.ambientLight = new THREE.AmbientLight(0xcc_cc_cc)
    this.scene.add(this.ambientLight)

    this.directionalLight = new THREE.DirectionalLight(0xff_ff_ff, 0.5)
    this.directionalLight.position.set(1, 1, 0.5).normalize()
    this.directionalLight.castShadow = true
    this.scene.add(this.directionalLight)

    const size = renderer.getSize(new THREE.Vector2())
    this.camera = new THREE.PerspectiveCamera(75, size.x / size.y, 0.1, 1000)

    this.world = new WorldRenderer(this.scene, numWorkers)
    this.entities = new Entities(this.scene)
    this.primitives = new Primitives(this.scene, this.camera)

    this.domElement = renderer.domElement
    this.playerHeight = 1.6
    this.isSneaking = false
  }

  resetAll () {
    this.world.resetWorld()
    this.entities.clear()
    this.primitives.clear()

    this.scene.background = this.skyColour
    this.ambientLight.intensity = 1
    this.directionalLight.intensity = 1
    this.directionalLight.position.set(1, 1, 0.5).normalize()
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

  updateTimecycleLighting (timeOfDay, moonPhase, isRaining) {
    if (timeOfDay === undefined) { return }
    const lightIntensity = this.calculateIntensity(timeOfDay)
    const newSkyColor = `#${this.darkenSkyColour(lightIntensity, isRaining).padStart(6, '0')}`

    function timeToRads (time) {
      return time * (Math.PI / 12000)
    }

    // Update colours
    this.scene.background = new THREE.Color(newSkyColor)
    const newAmbientIntensity = Math.min(0.43, lightIntensity * 0.75) + (0.04 - (moonPhase / 100))
    const newDirectionalIntensity = Math.min(0.63, lightIntensity) + (0.06 - (moonPhase / 100))
    this.ambientLight.intensity = newAmbientIntensity
    this.directionalLight.intensity = newDirectionalIntensity
    this.directionalLight.position.set(
      Math.cos(timeToRads(timeOfDay)),
      Math.sin(timeToRads(timeOfDay)),
      0.2
    ).normalize()
  }

  calculateIntensity (currentTicks) {
    const transitionStart = 12000
    const transitionEnd = 18000
    const timeInDay = (currentTicks % 24000)
    let lightIntensity: number

    if (timeInDay < transitionStart) {
      lightIntensity = 1.0
    } else if (timeInDay < transitionEnd) {
      lightIntensity = 1 - (timeInDay - transitionStart) / (transitionEnd - transitionStart)
    } else {
      lightIntensity = (timeInDay - transitionEnd) / (24000 - transitionEnd)
    }

    return lightIntensity
  }

  /** Darken by factor (0 to black, 0.5 half as bright, 1 unchanged) */
  darkenSkyColour (factor: number, isRaining) {
    const skyColour = this.skyColour.getHex()
    let r = (skyColour & 0x00_00_FF);
    let g = ((skyColour >> 8) & 0x00_FF);
    let b = (skyColour >> 16);
    if (isRaining) {
      r = 111 / 255
      g = 156 / 255
      b = 236 / 255
    }
    return (Math.round(r * factor) |
      (Math.round(g * factor) << 8) |
      (Math.round(b * factor) << 16)).toString(16)
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

    emitter.on('timecycleUpdate', ({ timeOfDay, moonPhase, isRaining }) => {
      this.updateTimecycleLighting(timeOfDay, moonPhase, isRaining)
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
