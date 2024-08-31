import * as THREE from 'three'
import * as tweenJs from '@tweenjs/tween.js'
import worldBlockProvider from 'mc-assets/dist/worldBlockProvider'
import { renderBlockThree } from './mesher/standaloneRenderer'

export default class HoldingBlock {
  holdingBlock: THREE.Object3D | null = null
  swingAnimation: tweenJs.Group = new tweenJs.Group()
  cameraGroup = new THREE.Mesh()
  objectOuterGroup = new THREE.Group()
  objectInnerGroup = new THREE.Group()
  camera: THREE.Group | THREE.PerspectiveCamera

  constructor (public scene: THREE.Scene) {
    this.initCameraGroup()
  }

  initCameraGroup () {
    this.cameraGroup = new THREE.Mesh()
    this.scene.add(this.cameraGroup)
  }

  updateCameraGroup () {
    const { camera } = this
    this.cameraGroup.position.copy(camera.position)
    this.cameraGroup.rotation.copy(camera.rotation)
  }

  startSwing () {
    this.stopSwing()
    const cube = this.cameraGroup.children[0]
    if (cube) {
      // const DURATION = 1000 * 0.35 / 2
      const DURATION = 1000
      //   new tweenJs.Tween(this.holdingBlock!.position, this.swingAnimation).to({ y: this.holdingBlock!.position.y - this.holdingBlock!.scale.y * 2 }, DURATION).yoyo(true).repeat(Infinity).start()
      new tweenJs.Tween(this.objectInnerGroup.rotation, this.swingAnimation).to({ z: THREE.MathUtils.degToRad(90) }, DURATION).yoyo(true).repeat(Infinity).start()
    }
  }

  stopSwing () {
    this.swingAnimation.removeAll()
  }

  update (camera: typeof this.camera) {
    this.camera = camera
    this.swingAnimation.update()
    this.updateCameraGroup()
  }

  initHandObject (material: THREE.Material, blockstatesModels: any, blocksAtlases: any) {
    const blockProvider = worldBlockProvider(blockstatesModels, blocksAtlases, 'latest')
    const models = blockProvider.getAllResolvedModels0_1({
      name: 'furnace',
      properties: {
      }
    }, true)
    // const geometry = new THREE.BoxGeometry(1, 1, 1)
    const geometry = renderBlockThree(models, undefined, 'plains', loadedData)
    // block material
    const block = new THREE.Mesh(geometry, material)
    block.name = 'holdingBlock'
    this.holdingBlock = block
    this.objectInnerGroup = new THREE.Group()
    this.objectInnerGroup.add(block)
    this.objectInnerGroup.position.set(-0.5, -1, -0.5)
    block.position.set(0.5, 1, 0.5)

    this.objectOuterGroup = new THREE.Group()
    this.objectOuterGroup.add(this.objectInnerGroup)

    this.cameraGroup.add(this.objectOuterGroup)
    // const rotation = 45
    // this.holdingBlock.rotation.set(0, -THREE.MathUtils.degToRad(rotation), 0, 'ZYX')

    const viewerSize = viewer.renderer.getSize(new THREE.Vector2())
    // const x = window.x ?? 0.25 * viewerSize.width / viewerSize.height
    // const x = 0.15 * viewerSize.width / viewerSize.height
    const x = 0 * viewerSize.width / viewerSize.height
    // const scale = window.scale ?? 0.2
    const scale = 0.2
    this.objectOuterGroup.scale.set(scale, scale, scale)
    // this.objectOuterGroup.position.set(x, window.y ?? -0.41, window.z ?? -0.45)
    this.objectOuterGroup.position.set(x, 0, -0.45)
    // this.objectOuterGroup.position.set(x, -0.41, -0.45)
  }
}
