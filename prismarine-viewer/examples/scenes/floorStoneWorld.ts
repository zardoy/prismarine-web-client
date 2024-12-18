import { Vec3 } from 'vec3'
import { BasePlaygroundScene } from '../baseScene'

export default class Scene extends BasePlaygroundScene {
  viewDistance = 16
  continuousRender = true
  targetPos = new Vec3(0, 0, 0)
  webgpuRendererParams = true

  override initGui (): void {
    this.params = {
      chunksDistance: 2,
    }

    super.initGui() // restore user params
  }

  async setupWorld () {
    // const chunkDistance = this.params.chunksDistance
    // for (let x = -chunkDistance; x < chunkDistance; x++) {
    //   for (let z = -chunkDistance; z < chunkDistance; z++) {
    //     webgpuChannel.generateRandom(16 ** 2, x * 16, z * 16)
    //   }
    // }

    const squareSize = this.params.chunksDistance * 16
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
        const isEven = x === z
        worldView!.world.setBlockStateId(this.targetPos.offset(x, 0, z), isEven ? 1 : 2)
      }
    }

    console.log('setting done')
  }
}
