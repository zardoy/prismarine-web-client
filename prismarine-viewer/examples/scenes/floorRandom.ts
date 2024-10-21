import { BasePlaygroundScene } from '../baseScene'

export default class RailsCobwebScene extends BasePlaygroundScene {
  viewDistance = 5
  continuousRender = true

  override initGui (): void {
    this.params = {
      squareSize: 50
    }

    super.initGui()
  }

  setupWorld () {
    const squareSize = this.params.squareSize ?? 30
    const maxSquareSize = this.viewDistance * 16 * 2
    if (squareSize > maxSquareSize) throw new Error(`Square size too big, max is ${maxSquareSize}`)
    // const fullBlocks = loadedData.blocksArray.map(x => x.name)
    const fullBlocks = loadedData.blocksArray.filter(block => {
      const b = this.Block.fromStateId(block.defaultState, 0)
      if (b.shapes?.length !== 1) return false
      const shape = b.shapes[0]
      return shape[0] === 0 && shape[1] === 0 && shape[2] === 0 && shape[3] === 1 && shape[4] === 1 && shape[5] === 1
    })
    for (let x = -squareSize; x <= squareSize; x++) {
      for (let z = -squareSize; z <= squareSize; z++) {
        const i = Math.abs(x + z) * squareSize
        worldView!.world.setBlock(this.targetPos.offset(x, 0, z), this.Block.fromStateId(fullBlocks[i % fullBlocks.length].defaultState, 0))
      }
    }
  }
}
