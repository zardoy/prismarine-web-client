import * as THREE from 'three'
import { Vec3 } from 'vec3'
import nbt from 'prismarine-nbt'
import PrismarineChatLoader from 'prismarine-chat'
import * as tweenJs from '@tweenjs/tween.js'
import { BloomPass, RenderPass, UnrealBloomPass, EffectComposer, WaterPass, GlitchPass, LineSegmentsGeometry, Wireframe, LineMaterial } from 'three-stdlib'
import worldBlockProvider from 'mc-assets/dist/worldBlockProvider'
import { renderSign } from '../sign-renderer'
import { chunkPos, sectionPos } from './simpleUtils'
import { WorldRendererCommon, WorldRendererConfig } from './worldrendererCommon'
import { disposeObject } from './threeJsUtils'
import HoldingBlock, { HandItemBlock } from './holdingBlock'
import { addNewStat } from './ui/newStats'
import { MesherGeometryOutput } from './mesher/shared'

export class WorldRendererThree extends WorldRendererCommon {
  interactionLines: null | { blockPos; mesh } = null
  outputFormat = 'threeJs' as const
  blockEntities = {}
  sectionObjects: Record<string, THREE.Object3D> = {}
  chunkTextures = new Map<string, { [pos: string]: THREE.Texture }>()
  signsCache = new Map<string, any>()
  starField: StarField
  cameraSectionPos: Vec3 = new Vec3(0, 0, 0)
  holdingBlock: HoldingBlock
  rendererDevice = '...'

  get tilesRendered () {
    return Object.values(this.sectionObjects).reduce((acc, obj) => acc + (obj as any).tilesCount, 0)
  }

  get blocksRendered () {
    return Object.values(this.sectionObjects).reduce((acc, obj) => acc + (obj as any).blocksCount, 0)
  }

  constructor (public scene: THREE.Scene, public renderer: THREE.WebGLRenderer, public config: WorldRendererConfig) {
    super(config)
    this.rendererDevice = String(WorldRendererThree.getRendererInfo(this.renderer))
    this.starField = new StarField(scene)
    this.holdingBlock = new HoldingBlock()

    this.renderUpdateEmitter.on('itemsTextureDownloaded', () => {
      if (this.holdingBlock.toBeRenderedItem || true) {
        this.onHandItemSwitch(this.holdingBlock.toBeRenderedItem)
        this.holdingBlock.toBeRenderedItem = undefined
      }
    })

    this.addDebugOverlay()
  }

  onHandItemSwitch (item: HandItemBlock | undefined) {
    item ??= {
      type: 'hand',
    }
    if (!this.currentTextureImage) {
      this.holdingBlock.toBeRenderedItem = item
      return
    }
    void this.holdingBlock.initHandObject(this.material, this.blockstatesModels, this.blocksAtlases, item)
  }

  changeHandSwingingState (isAnimationPlaying: boolean) {
    if (isAnimationPlaying) {
      this.holdingBlock.startSwing()
    } else {
      void this.holdingBlock.stopSwing()
    }
  }

  changeBackgroundColor (color: [number, number, number]): void {
    this.scene.background = new THREE.Color(color[0], color[1], color[2])
  }

  timeUpdated (newTime: number): void {
    const nightTime = 13_500
    const morningStart = 23_000
    const displayStars = newTime > nightTime && newTime < morningStart
    if (displayStars) {
      this.starField.addToScene()
    } else {
      this.starField.remove()
    }
  }

  debugOverlayAdded = false
  addDebugOverlay () {
    if (this.debugOverlayAdded) return
    this.debugOverlayAdded = true
    const pane = addNewStat('debug-overlay')
    setInterval(() => {
      pane.setVisibility(this.displayStats)
      if (this.displayStats) {
        pane.updateText(`C: ${this.renderer.info.render.calls} TR: ${this.renderer.info.render.triangles} TE: ${this.renderer.info.memory.textures} F: ${this.tilesRendered} B: ${this.blocksRendered}`)
      }
    }, 100)
  }

  /**
   * Optionally update data that are depedendent on the viewer position
   */
  updatePosDataChunk (key: string) {
    const [x, y, z] = key.split(',').map(x => Math.floor(+x / 16))
    // sum of distances: x + y + z
    const chunkDistance = Math.abs(x - this.cameraSectionPos.x) + Math.abs(y - this.cameraSectionPos.y) + Math.abs(z - this.cameraSectionPos.z)
    const section = this.sectionObjects[key].children.find(child => child.name === 'mesh')!
    section.renderOrder = 500 - chunkDistance
  }

  updateViewerPosition (pos: Vec3): void {
    this.viewerPosition = pos
    const cameraPos = this.camera.position.toArray().map(x => Math.floor(x / 16)) as [number, number, number]
    this.cameraSectionPos = new Vec3(...cameraPos)
    // eslint-disable-next-line guard-for-in
    for (const key in this.sectionObjects) {
      const value = this.sectionObjects[key]
      if (!value) continue
      this.updatePosDataChunk(key)
    }
  }

  // debugRecomputedDeletedObjects = 0
  handleWorkerMessage (data: { geometry: MesherGeometryOutput, key, type }): void {
    if (data.type !== 'geometry') return
    let object: THREE.Object3D = this.sectionObjects[data.key]
    if (object) {
      this.scene.remove(object)
      disposeObject(object)
      delete this.sectionObjects[data.key]
    }

    const chunkCoords = data.key.split(',')
    if (!this.loadedChunks[chunkCoords[0] + ',' + chunkCoords[2]] || !data.geometry.positions.length || !this.active) return

    // if (object) {
    //   this.debugRecomputedDeletedObjects++
    // }

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
    // mesh with static dimensions: 16x16x16
    const staticChunkMesh = new THREE.Mesh(new THREE.BoxGeometry(16, 16, 16), new THREE.MeshBasicMaterial({ color: 0x00_00_00, transparent: true, opacity: 0 }))
    staticChunkMesh.position.set(data.geometry.sx, data.geometry.sy, data.geometry.sz)
    const boxHelper = new THREE.BoxHelper(staticChunkMesh, 0xff_ff_00)
    boxHelper.name = 'helper'
    object.add(boxHelper)
    object.name = 'chunk';
    (object as any).tilesCount = data.geometry.positions.length / 3 / 4;
    (object as any).blocksCount = data.geometry.blocksCount
    if (!this.config.showChunkBorders) {
      boxHelper.visible = false
    }
    // should not compute it once
    if (Object.keys(data.geometry.signs).length) {
      for (const [posKey, { isWall, isHanging, rotation }] of Object.entries(data.geometry.signs)) {
        const [x, y, z] = posKey.split(',')
        const signBlockEntity = this.blockEntities[posKey]
        if (!signBlockEntity) continue
        const sign = this.renderSign(new Vec3(+x, +y, +z), rotation, isWall, isHanging, nbt.simplify(signBlockEntity))
        if (!sign) continue
        object.add(sign)
      }
    }
    this.sectionObjects[data.key] = object
    this.updatePosDataChunk(data.key)
    object.matrixAutoUpdate = false
    mesh.onAfterRender = (renderer, scene, camera, geometry, material, group) => {
      // mesh.matrixAutoUpdate = false
    }

    this.scene.add(object)
  }

  getSignTexture (position: Vec3, blockEntity, backSide = false) {
    const chunk = chunkPos(position)
    let textures = this.chunkTextures.get(`${chunk[0]},${chunk[1]}`)
    if (!textures) {
      textures = {}
      this.chunkTextures.set(`${chunk[0]},${chunk[1]}`, textures)
    }
    const texturekey = `${position.x},${position.y},${position.z}`
    // todo investigate bug and remove this so don't need to clean in section dirty
    if (textures[texturekey]) return textures[texturekey]

    const PrismarineChat = PrismarineChatLoader(this.version!)
    const canvas = renderSign(blockEntity, PrismarineChat)
    if (!canvas) return
    const tex = new THREE.Texture(canvas)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    tex.needsUpdate = true
    textures[texturekey] = tex
    return tex
  }

  updateCamera (pos: Vec3 | null, yaw: number, pitch: number): void {
    if (pos) {
      new tweenJs.Tween(this.camera.position).to({ x: pos.x, y: pos.y, z: pos.z }, 50).start()
    }
    this.camera.rotation.set(pitch, yaw, 0, 'ZYX')
  }

  render () {
    tweenJs.update()
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    const cam = this.camera instanceof THREE.Group ? this.camera.children.find(child => child instanceof THREE.PerspectiveCamera) as THREE.PerspectiveCamera : this.camera
    this.renderer.render(this.scene, cam)
    this.holdingBlock.render(this.camera, this.renderer, viewer.ambientLight, viewer.directionalLight)
  }

  renderSign (position: Vec3, rotation: number, isWall: boolean, isHanging: boolean, blockEntity) {
    const tex = this.getSignTexture(position, blockEntity)

    if (!tex) return

    // todo implement
    // const key = JSON.stringify({ position, rotation, isWall })
    // if (this.signsCache.has(key)) {
    //   console.log('cached', key)
    // } else {
    //   this.signsCache.set(key, tex)
    // }

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true }))
    mesh.renderOrder = 999

    const lineHeight = 7 / 16
    const scaleFactor = isHanging ? 1.3 : 1
    mesh.scale.set(1 * scaleFactor, lineHeight * scaleFactor, 1 * scaleFactor)

    const thickness = (isHanging ? 2 : 1.5) / 16
    const wallSpacing = 0.25 / 16
    if (isWall && !isHanging) {
      mesh.position.set(0, 0, -0.5 + thickness + wallSpacing + 0.0001)
    } else {
      mesh.position.set(0, 0, thickness / 2 + 0.0001)
    }

    const group = new THREE.Group()
    group.rotation.set(
      0,
      -THREE.MathUtils.degToRad(rotation * (isWall ? 90 : 45 / 2)),
      0
    )
    group.add(mesh)
    const height = (isHanging ? 10 : 8) / 16
    const heightOffset = (isHanging ? 0 : isWall ? 4.333 : 9.333) / 16
    const textPosition = height / 2 + heightOffset
    group.position.set(position.x + 0.5, position.y + textPosition, position.z + 0.5)
    return group
  }

  updateLight (chunkX: number, chunkZ: number) {
    // set all sections in the chunk dirty
    for (let y = this.worldConfig.minY; y < this.worldConfig.worldHeight; y += 16) {
      this.setSectionDirty(new Vec3(chunkX, y, chunkZ))
    }
  }

  async doHmr () {
    const oldSections = { ...this.sectionObjects }
    this.sectionObjects = {} // skip clearing
    worldView!.unloadAllChunks()
    void this.setVersion(this.version, this.texturesVersion)
    this.sectionObjects = oldSections
    // this.rerenderAllChunks()

    // supply new data
    await worldView!.updatePosition(bot.entity.position, true)
  }

  rerenderAllChunks () { // todo not clear what to do with loading chunks
    for (const key of Object.keys(this.sectionObjects)) {
      const [x, y, z] = key.split(',').map(Number)
      this.setSectionDirty(new Vec3(x, y, z))
    }
  }

  updateShowChunksBorder (value: boolean) {
    this.config.showChunkBorders = value
    for (const object of Object.values(this.sectionObjects)) {
      for (const child of object.children) {
        if (child.name === 'helper') {
          child.visible = value
        }
      }
    }
  }

  resetWorld () {
    super.resetWorld()

    for (const mesh of Object.values(this.sectionObjects)) {
      this.scene.remove(mesh)
    }
  }

  getLoadedChunksRelative (pos: Vec3, includeY = false) {
    const [currentX, currentY, currentZ] = sectionPos(pos)
    return Object.fromEntries(Object.entries(this.sectionObjects).map(([key, o]) => {
      const [xRaw, yRaw, zRaw] = key.split(',').map(Number)
      const [x, y, z] = sectionPos({ x: xRaw, y: yRaw, z: zRaw })
      const setKey = includeY ? `${x - currentX},${y - currentY},${z - currentZ}` : `${x - currentX},${z - currentZ}`
      return [setKey, o]
    }))
  }

  cleanChunkTextures (x, z) {
    const textures = this.chunkTextures.get(`${Math.floor(x / 16)},${Math.floor(z / 16)}`) ?? {}
    for (const key of Object.keys(textures)) {
      textures[key].dispose()
      delete textures[key]
    }
  }

  readdChunks () {
    for (const key of Object.keys(this.sectionObjects)) {
      this.scene.remove(this.sectionObjects[key])
    }
    setTimeout(() => {
      for (const key of Object.keys(this.sectionObjects)) {
        this.scene.add(this.sectionObjects[key])
      }
    }, 500)
  }

  disableUpdates (children = this.scene.children) {
    for (const child of children) {
      child.matrixWorldNeedsUpdate = false
      this.disableUpdates(child.children ?? [])
    }
  }

  removeColumn (x, z) {
    super.removeColumn(x, z)

    this.cleanChunkTextures(x, z)
    for (let y = this.worldConfig.minY; y < this.worldConfig.worldHeight; y += 16) {
      this.setSectionDirty(new Vec3(x, y, z), false)
      const key = `${x},${y},${z}`
      const mesh = this.sectionObjects[key]
      if (mesh) {
        this.scene.remove(mesh)
        disposeObject(mesh)
      }
      delete this.sectionObjects[key]
    }
  }

  setSectionDirty (...args: Parameters<WorldRendererCommon['setSectionDirty']>) {
    const [pos] = args
    this.cleanChunkTextures(pos.x, pos.z) // todo don't do this!
    super.setSectionDirty(...args)
  }

  setHighlightCursorBlock (blockPos: typeof this.cursorBlock, shapePositions?: Array<{ position: any; width: any; height: any; depth: any; }>): void {
    this.cursorBlock = blockPos
    if (blockPos && this.interactionLines && blockPos.equals(this.interactionLines.blockPos)) {
      return
    }
    if (this.interactionLines !== null) {
      this.scene.remove(this.interactionLines.mesh)
      this.interactionLines = null
    }
    if (blockPos === null) {
      return
    }

    const group = new THREE.Group()
    for (const { position, width, height, depth } of shapePositions ?? []) {
      const scale = [1.0001 * width, 1.0001 * height, 1.0001 * depth] as const
      const geometry = new THREE.BoxGeometry(...scale)
      const lines = new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geometry))
      const wireframe = new Wireframe(lines, this.threejsCursorLineMaterial)
      const pos = blockPos.plus(position)
      wireframe.position.set(pos.x, pos.y, pos.z)
      wireframe.computeLineDistances()
      group.add(wireframe)
    }
    this.scene.add(group)
    this.interactionLines = { blockPos, mesh: group }
  }

  static getRendererInfo (renderer: THREE.WebGLRenderer) {
    try {
      const gl = renderer.getContext()
      return `${gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')!.UNMASKED_RENDERER_WEBGL)} powered by three.js r{THREE.REVISION}`
    } catch (err) {
      console.warn('Failed to get renderer info', err)
    }
  }
}

class StarField {
  points?: THREE.Points
  private _enabled = true
  get enabled () {
    return this._enabled
  }

  set enabled (value) {
    this._enabled = value
    if (this.points) {
      this.points.visible = value
    }
  }

  constructor (private readonly scene: THREE.Scene) {
  }

  addToScene () {
    if (this.points || !this.enabled) return

    const radius = 80
    const depth = 50
    const count = 7000
    const factor = 7
    const saturation = 10
    const speed = 0.2

    const geometry = new THREE.BufferGeometry()

    const genStar = r => new THREE.Vector3().setFromSpherical(new THREE.Spherical(r, Math.acos(1 - Math.random() * 2), Math.random() * 2 * Math.PI))

    const positions = [] as number[]
    const colors = [] as number[]
    const sizes = Array.from({ length: count }, () => (0.5 + 0.5 * Math.random()) * factor)
    const color = new THREE.Color()
    let r = radius + depth
    const increment = depth / count
    for (let i = 0; i < count; i++) {
      r -= increment * Math.random()
      positions.push(...genStar(r).toArray())
      color.setHSL(i / count, saturation, 0.9)
      colors.push(color.r, color.g, color.b)
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

    // Create a material
    const material = new StarfieldMaterial()
    material.blending = THREE.AdditiveBlending
    material.depthTest = false
    material.transparent = true

    // Create points and add them to the scene
    this.points = new THREE.Points(geometry, material)
    this.scene.add(this.points)

    const clock = new THREE.Clock()
    this.points.onBeforeRender = (renderer, scene, camera) => {
      this.points?.position.copy?.(camera.position)
      material.uniforms.time.value = clock.getElapsedTime() * speed
    }
    this.points.renderOrder = -1
  }

  remove () {
    if (this.points) {
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose()
      this.scene.remove(this.points)

      this.points = undefined
    }
  }
}

const version = parseInt(THREE.REVISION.replaceAll(/\D+/g, ''), 10)
class StarfieldMaterial extends THREE.ShaderMaterial {
  constructor () {
    super({
      uniforms: { time: { value: 0 }, fade: { value: 1 } },
      vertexShader: /* glsl */ `
                uniform float time;
                attribute float size;
                varying vec3 vColor;
                attribute vec3 color;
                void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 0.5);
                gl_PointSize = 0.7 * size * (30.0 / -mvPosition.z) * (3.0 + sin(time + 100.0));
                gl_Position = projectionMatrix * mvPosition;
            }`,
      fragmentShader: /* glsl */ `
                uniform sampler2D pointTexture;
                uniform float fade;
                varying vec3 vColor;
                void main() {
                float opacity = 1.0;
                gl_FragColor = vec4(vColor, 1.0);

                #include <tonemapping_fragment>
                #include <${version >= 154 ? 'colorspace_fragment' : 'encodings_fragment'}>
            }`,
    })
  }
}
