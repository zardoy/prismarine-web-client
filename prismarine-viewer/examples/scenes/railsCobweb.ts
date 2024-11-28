import { BasePlaygroundScene } from '../baseScene'

export default class RailsCobwebScene extends BasePlaygroundScene {
  setupWorld () {
    this.addWorldBlock(0, 0, 0, 'cobweb')
    this.addWorldBlock(0, -1, 0, 'cobweb')
    this.addWorldBlock(1, -1, 0, 'cobweb')
    this.addWorldBlock(1, 0, 0, 'cobweb')

    this.addWorldBlock(0, 0, 1, 'powered_rail', { shape: 'north_south', waterlogged: false })
    this.addWorldBlock(0, 0, 2, 'powered_rail', { shape: 'ascending_south', waterlogged: false })
    this.addWorldBlock(0, 1, 3, 'powered_rail', { shape: 'north_south', waterlogged: false })
  }
}
