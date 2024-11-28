import * as THREE from 'three'
import { Vec3 } from 'vec3'
import { BasePlaygroundScene } from '../baseScene'
import { WorldRendererThree } from '../../viewer/lib/worldrendererThree'

export default class extends BasePlaygroundScene {
  continuousRender = true

  override initGui (): void {
    this.params = {
      starfield: false,
      entity: 'player',
      count: 4
    }
  }

  override renderFinish (): void {
    if (this.params.starfield) {
      ;(viewer.world as WorldRendererThree).scene.background = new THREE.Color(0x00_00_00)
      ;(viewer.world as WorldRendererThree).starField.enabled = true
      ;(viewer.world as WorldRendererThree).starField.addToScene()
    }

    for (let i = 0; i < this.params.count; i++) {
      for (let j = 0; j < this.params.count; j++) {
        for (let k = 0; k < this.params.count; k++) {
          viewer.entities.update({
            id: i * 1000 + j * 100 + k,
            name: this.params.entity,
            pos: this.targetPos.offset(i, j, k)
          } as any, {})
        }
      }
    }
  }
}
