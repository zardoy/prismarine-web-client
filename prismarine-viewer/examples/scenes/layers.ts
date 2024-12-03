import { Vec3 } from 'vec3'
import { BasePlaygroundScene } from '../baseScene'
import { webgpuChannel } from '../webgpuRendererMain'

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

    const start = -squareSize
    const end = squareSize

    const STEP = 40
    for (let y = 0; y <= 256; y += STEP) {
      for (let x = start; x <= end; x++) {
        for (let z = start; z <= end; z++) {
          const isEven = x === z
          worldView!.world.setBlockStateId(this.targetPos.offset(x, y, z), fullBlocks[y / STEP]!.defaultState)
        }
      }
    }

    console.log('setting done')
  }
}
