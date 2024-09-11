import { Vec3 } from 'vec3'
import * as THREE from 'three'
import '../../src/getCollisionShapes'
import { IndexedData } from 'minecraft-data'
import BlockLoader from 'prismarine-block'
import blockstatesModels from 'mc-assets/dist/blockStatesModels.json'
import ChunkLoader from 'prismarine-chunk'
import WorldLoader from 'prismarine-world'

//@ts-expect-error
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
// eslint-disable-next-line import/no-named-as-default
import GUI from 'lil-gui'
import _ from 'lodash'
import { toMajorVersion } from '../../src/utils'
import { WorldDataEmitter } from '../viewer'
import { Viewer } from '../viewer/lib/viewer'

window.THREE = THREE

export class BasePlaygroundScene {
  continuousRender = false
  guiParams = {}
  viewDistance = 0
  targetPos = new Vec3(2, 90, 2)
  params = {} as Record<string, any>
  paramOptions = {} as Partial<Record<keyof typeof this.params, {
    hide?: boolean
    options?: string[]
    min?: number
    max?: number
  }>>
  version = new URLSearchParams(window.location.search).get('version') || globalThis.includedVersions.at(-1)
  Chunk: typeof import('prismarine-chunk/types/index').PCChunk
  Block: typeof import('prismarine-block').Block
  ignoreResize = false
  enableCameraOrbitControl = true
  gui = new GUI()
  onParamUpdate = {} as Record<string, () => void>
  alwaysIgnoreQs = [] as string[]

  constructor (public availableScenes: string[]) {
    void this.initData()
  }

  onParamsUpdate (paramName: string, object: any) {}
  updateQs () {
    const newQs = new URLSearchParams()
    for (const [key, value] of Object.entries(this.params)) {
      if (!value || typeof value === 'function' || this.params.skipQs.includes(key) || this.alwaysIgnoreQs.includes(key)) continue
      newQs.set(key, value)
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${newQs.toString()}`)

  }

  async initialSetup () {}
  renderFinish () {
    this.render()
  }

  initGui () {
    const qs = new URLSearchParams(window.location.search)
    for (const [key, value] of qs.entries()) {
      const parsed = /^-?\d+$/.test(value) ? Number(value) : value === 'true' ? true : value === 'false' ? false : value
      this.params[key] = parsed
    }

    for (const param of Object.keys(this.params)) {
      const option = this.paramOptions[param]
      if (option?.hide) continue
      this.gui.add(this.params, param, option?.options ?? option?.min, option?.max)
    }
    this.gui.open(false)

    this.gui.onChange(({ property, object }) => {
      if (object === this.params) {
        this.onParamUpdate[property]?.()
        this.onParamsUpdate(property, object)
      } else {
        this.onParamsUpdate(property, object)
      }
    })

    this.onParamsUpdate('', {})
  }

  async initData () {
    await window._LOAD_MC_DATA()
    const mcData: IndexedData = require('minecraft-data')(this.version)
    window.loadedData = window.mcData = mcData

    this.Chunk = (ChunkLoader as any)(this.version)
    this.Block = (BlockLoader as any)(this.version)

    const World = (WorldLoader as any)(this.version)
    const world = new World((chunkX, chunkZ) => {
      return new this.Chunk(undefined as any)
    })

    const worldView = new WorldDataEmitter(world, this.viewDistance, this.targetPos)

    // Create three.js context, add to page
    const renderer = new THREE.WebGLRenderer({ alpha: true, ...localStorage['renderer'] })
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    // Create viewer
    const viewer = new Viewer(renderer, { numWorkers: 1, showChunkBorders: false, })
    viewer.addChunksBatchWaitTime = 0
    viewer.world.blockstatesModels = blockstatesModels
    viewer.entities.setDebugMode('basic')
    viewer.setVersion(this.version)
    viewer.entities.onSkinUpdate = () => {
      viewer.render()
    }
    viewer.world.mesherConfig.enableLighting = false

    viewer.connect(worldView)

    await worldView.init(this.targetPos)
    window.worldView = worldView
    window.viewer = viewer

    if (this.enableCameraOrbitControl) {
      const { targetPos } = this
      const controls = new OrbitControls(viewer.camera, renderer.domElement)
      controls.target.set(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)

      const cameraPos = targetPos.offset(2, 2, 2)
      const pitch = THREE.MathUtils.degToRad(-45)
      const yaw = THREE.MathUtils.degToRad(45)
      viewer.camera.rotation.set(pitch, yaw, 0, 'ZYX')
      viewer.camera.lookAt(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)
      viewer.camera.position.set(cameraPos.x + 0.5, cameraPos.y + 0.5, cameraPos.z + 0.5)
      controls.update()

      // #region camera rotation param
      const cameraSet = this.params.camera || localStorage.camera
      if (cameraSet) {
        const [x, y, z, rx, ry] = cameraSet.split(',').map(Number)
        viewer.camera.position.set(x, y, z)
        viewer.camera.rotation.set(rx, ry, 0, 'ZYX')
        controls.update()
      }
      const throttledCamQsUpdate = _.throttle(() => {
        const { camera } = viewer
        // params.camera = `${camera.rotation.x.toFixed(2)},${camera.rotation.y.toFixed(2)}`
        // this.updateQs()
        localStorage.camera = [
          camera.position.x.toFixed(2),
          camera.position.y.toFixed(2),
          camera.position.z.toFixed(2),
          camera.rotation.x.toFixed(2),
          camera.rotation.y.toFixed(2),
        ].join(',')
      }, 200)
      controls.addEventListener('change', () => {
        throttledCamQsUpdate()
        this.render()
      })
      // #endregion
    }

    await this.initialSetup()
    this.onResize()
    window.addEventListener('resize', () => this.onResize())
    void viewer.waitForChunksToRender().then(async () => {
      this.renderFinish()
    })

    viewer.world.renderUpdateEmitter.addListener('update', () => {
      this.render()
    })

    this.initGui()
    this.loop()
  }

  loop () {
    if (this.continuousRender) {
      this.render()
      requestAnimationFrame(() => this.loop())
    }
  }

  render () {
    viewer.render()
  }

  onResize () {
    if (this.ignoreResize) return

    const { camera, renderer } = viewer
    viewer.camera.aspect = window.innerWidth / window.innerHeight
    viewer.camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)

    this.render()
  }
}
