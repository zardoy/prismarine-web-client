import * as THREE from 'three'
import { BasePlaygroundScene } from '../baseScene'

export default class RailsCobwebScene extends BasePlaygroundScene {
  setupWorld () {
    viewer.scene.background = new THREE.Color(0x00_00_00)

  }
}
