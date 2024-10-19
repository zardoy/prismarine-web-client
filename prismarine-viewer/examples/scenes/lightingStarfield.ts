import * as THREE from 'three'
import { Vec3 } from 'vec3'
import { BasePlaygroundScene } from '../baseScene'
import { WorldRendererThree } from '../../viewer/lib/worldrendererThree'

export default class extends BasePlaygroundScene {
  continuousRender = true

  override setupWorld (): void {
    viewer.world.mesherConfig.enableLighting = true
    viewer.world.mesherConfig.skyLight = 0
    this.addWorldBlock(0, 0, 0, 'stone')
    this.addWorldBlock(0, 0, 1, 'stone')
    this.addWorldBlock(1, 0, 0, 'stone')
    this.addWorldBlock(1, 0, 1, 'stone')
    // chess like
    worldView?.world.setBlockLight(this.targetPos.offset(0, 1, 0), 15)
    worldView?.world.setBlockLight(this.targetPos.offset(0, 1, 1), 0)
    worldView?.world.setBlockLight(this.targetPos.offset(1, 1, 0), 0)
    worldView?.world.setBlockLight(this.targetPos.offset(1, 1, 1), 15)
  }

  override renderFinish (): void {
    viewer.scene.background = new THREE.Color(0x00_00_00)
    // starfield and test entities
    ;(viewer.world as WorldRendererThree).starField.enabled = true
    ;(viewer.world as WorldRendererThree).starField.addToScene()
    viewer.entities.update({
      id: 0,
      name: 'player',
      pos: this.targetPos.clone()
    } as any, {})
    viewer.entities.update({
      id: 1,
      name: 'creeper',
      pos: this.targetPos.offset(1, 0, 0)
    } as any, {})
  }
}
