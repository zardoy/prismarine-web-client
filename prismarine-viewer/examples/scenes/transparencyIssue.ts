import { BasePlaygroundScene } from '../baseScene'

export default class extends BasePlaygroundScene {
  setupWorld () {
    this.addWorldBlock(0, 0, 0, 'water')
    this.addWorldBlock(0, 1, 0, 'lime_stained_glass')
    this.addWorldBlock(0, 0, -1, 'lime_stained_glass')
    this.addWorldBlock(0, -1, 0, 'lime_stained_glass')
    this.addWorldBlock(0, -1, -1, 'stone')
  }
}
