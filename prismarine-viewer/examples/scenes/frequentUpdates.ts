import { BasePlaygroundScene } from '../baseScene'

export default class extends BasePlaygroundScene {
  viewDistance = 5
  continuousRender = true

  override initGui (): void {
    this.params = {
      squareSize: 50
    }

    super.initGui()
  }

  setupTimer () {
    // const limit = 1000
    // const limit = 100
    const limit = 1
    const updatedChunks = new Set<string>()
    const updatedBlocks = new Set<string>()
    let lastSecond = 0
    setInterval(() => {
      const second = Math.floor(performance.now() / 1000)
      if (lastSecond !== second) {
        lastSecond = second
        updatedChunks.clear()
        updatedBlocks.clear()
      }
      const isEven = second % 2 === 0
      if (updatedBlocks.size > limit) {
        return
      }
      const changeBlock = (x, z) => {
        const chunkKey = `${Math.floor(x / 16)},${Math.floor(z / 16)}`
        const key = `${x},${z}`
        if (updatedBlocks.has(chunkKey)) return

        updatedChunks.add(chunkKey)
        worldView!.world.setBlock(this.targetPos.offset(x, 0, z), this.Block.fromStateId(isEven ? 2 : 3, 0))
        updatedBlocks.add(key)
      }
      const { squareSize } = this.params
      const xStart = -squareSize
      const zStart = -squareSize
      const xEnd = squareSize
      const zEnd = squareSize
      for (let x = xStart; x <= xEnd; x += 16) {
        for (let z = zStart; z <= zEnd; z += 16) {
          const key = `${x},${z}`
          if (updatedChunks.has(key)) continue
          changeBlock(x, z)
          return
        }
      }
      // for (let x = xStart; x <= xEnd; x += 16) {
      //   for (let z = zStart; z <= zEnd; z += 16) {
      //     const key = `${x},${z}`
      //     if (updatedChunks.has(key)) continue
      //     changeBlock(x, z)
      //     return
      //   }
      // }
    }, 1)
  }

  setupWorld () {
    this.params.squareSize ??= 30
    const { squareSize } = this.params
    const maxSquareSize = this.viewDistance * 16 * 2
    if (squareSize > maxSquareSize) throw new Error(`Square size too big, max is ${maxSquareSize}`)
    // const fullBlocks = loadedData.blocksArray.map(x => x.name)
    for (let x = -squareSize; x <= squareSize; x++) {
      for (let z = -squareSize; z <= squareSize; z++) {
        const i = Math.abs(x + z) * squareSize
        worldView!.world.setBlock(this.targetPos.offset(x, 0, z), this.Block.fromStateId(1, 0))
      }
    }
    let done = false
    viewer.world.renderUpdateEmitter.on('update', () => {
      if (!viewer.world.allChunksFinished || done) return
      done = true
      this.setupTimer()
    })
  }
}
