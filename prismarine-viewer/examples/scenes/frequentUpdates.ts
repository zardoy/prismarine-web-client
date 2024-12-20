import { Vec3 } from 'vec3'
import { BasePlaygroundScene } from '../baseScene'

export default class extends BasePlaygroundScene {
  viewDistance = 5
  continuousRender = true

  override initGui (): void {
    this.params = {
      testActive: false,
      testUpdatesPerSecond: 10,
      testInitialUpdate: false,
      stopGeometryUpdate: false,
      manualTest: () => {
        this.updateBlock()
      },
      testNeighborUpdates: () => {
        this.testNeighborUpdates()
      }
    }

    super.initGui()
  }

  lastUpdatedOffset = 0
  lastUpdatedId = 2
  updateBlock () {
    const x = this.lastUpdatedOffset % 16
    const z = Math.floor(this.lastUpdatedOffset / 16)
    const y = 90
    worldView!.setBlockStateId(new Vec3(x, y, z), this.lastUpdatedId++)
    this.lastUpdatedOffset++
    if (this.lastUpdatedOffset > 16 * 16) this.lastUpdatedOffset = 0
    if (this.lastUpdatedId > 500) this.lastUpdatedId = 1
  }

  testNeighborUpdates () {
    viewer.world.setBlockStateId(new Vec3(15, 95, 15), 1)
    viewer.world.setBlockStateId(new Vec3(0, 95, 15), 1)
    viewer.world.setBlockStateId(new Vec3(15, 95, 0), 1)
    viewer.world.setBlockStateId(new Vec3(0, 95, 0), 1)

    viewer.world.setBlockStateId(new Vec3(16, 95, 15), 1)
    viewer.world.setBlockStateId(new Vec3(-1, 95, 15), 1)
    viewer.world.setBlockStateId(new Vec3(15, 95, -1), 1)
    viewer.world.setBlockStateId(new Vec3(-1, 95, 0), 1)
    setTimeout(() => {
      viewer.world.setBlockStateId(new Vec3(16, 96, 16), 1)
      viewer.world.setBlockStateId(new Vec3(-1, 96, 16), 1)
      viewer.world.setBlockStateId(new Vec3(16, 96, -1), 1)
      viewer.world.setBlockStateId(new Vec3(-1, 96, -1), 1)
    }, 3000)
  }

  setupTimer () {
    // this.stopRender = true

    let lastTime = 0
    const tick = () => {
      viewer.world.debugStopGeometryUpdate = this.params.stopGeometryUpdate
      const updateEach = 1000 / this.params.testUpdatesPerSecond
      requestAnimationFrame(tick)
      if (!this.params.testActive) return
      const updateCount = Math.floor(performance.now() - lastTime) / updateEach
      for (let i = 0; i < updateCount; i++) {
        this.updateBlock()
      }
      lastTime = performance.now()
    }

    requestAnimationFrame(tick)

    // const limit = 1000
    // const limit = 100
    // const limit = 1
    // const updatedChunks = new Set<string>()
    // const updatedBlocks = new Set<string>()
    // let lastSecond = 0
    // setInterval(() => {
    //   const second = Math.floor(performance.now() / 1000)
    //   if (lastSecond !== second) {
    //     lastSecond = second
    //     updatedChunks.clear()
    //     updatedBlocks.clear()
    //   }
    //   const isEven = second % 2 === 0
    //   if (updatedBlocks.size > limit) {
    //     return
    //   }
    //   const changeBlock = (x, z) => {
    //     const chunkKey = `${Math.floor(x / 16)},${Math.floor(z / 16)}`
    //     const key = `${x},${z}`
    //     if (updatedBlocks.has(chunkKey)) return

    //     updatedChunks.add(chunkKey)
    //     worldView!.world.setBlock(this.targetPos.offset(x, 0, z), this.Block.fromStateId(isEven ? 2 : 3, 0))
    //     updatedBlocks.add(key)
    //   }
    //   const { squareSize } = this.params
    //   const xStart = -squareSize
    //   const zStart = -squareSize
    //   const xEnd = squareSize
    //   const zEnd = squareSize
    //   for (let x = xStart; x <= xEnd; x += 16) {
    //     for (let z = zStart; z <= zEnd; z += 16) {
    //       const key = `${x},${z}`
    //       if (updatedChunks.has(key)) continue
    //       changeBlock(x, z)
    //       return
    //     }
    //   }
    // for (let x = xStart; x <= xEnd; x += 16) {
    //   for (let z = zStart; z <= zEnd; z += 16) {
    //     const key = `${x},${z}`
    //     if (updatedChunks.has(key)) continue
    //     changeBlock(x, z)
    //     return
    //   }
    // }
    // }, 1)
  }

  setupWorld () {
    this.worldConfig.showChunkBorders = true

    const maxSquareRadius = this.viewDistance * 16
    // const fullBlocks = loadedData.blocksArray.map(x => x.name)
    const squareSize = maxSquareRadius
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
    setTimeout(() => {
      if (this.params.testInitialUpdate) {
        this.updateBlock()
      }
    })
  }
}
