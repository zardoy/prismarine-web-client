import { addBlocksSection, removeBlocksSection } from '../../examples/webglRenderer'
import { WorldRendererCommon } from './worldrendererCommon'

export class WorldRendererWebgl extends WorldRendererCommon {
  hasWithFrames = undefined as number | undefined
  newChunks = {} as Record<string, any>

  constructor(numWorkers = 4) {
    super(numWorkers)
  }

  handleWorkerMessage (data: any): void {
    if (data.type === 'geometry') {

      const chunkCoords = data.key.split(',')
      if (/* !this.loadedChunks[chunkCoords[0] + ',' + chunkCoords[2]] ||  */ !this.active) return

      addBlocksSection(data.key, data.geometry)
      const blocks = Object.values(data.geometry.blocks) as any[]
      const animatedFrames = blocks.find((x: any) => {
        return x.animatedFrames
      });
      this.hasWithFrames = animatedFrames?.animatedFrames
      this.newChunks[data.key] = data.geometry
    }
  }

  updatePosDataChunk (key: string) {
  }


  updateShowChunksBorder (value: boolean) {
    // todo
  }


  removeColumn (x, z) {
    super.removeColumn(x, z)
    for (const key of Object.keys(this.newChunks)) {
      const [xSec, _ySec, zSec] = key.split(',').map(Number)
      // if (Math.floor(x / 16) === x && Math.floor(z / 16) === z) {
      if (x === xSec && z === zSec) {
        // foundSections.push(key)
        removeBlocksSection(key)
      }
    }
    // for (let y = this.worldConfig.minY; y < this.worldConfig.worldHeight; y += 16) {
    //   this.setSectionDirty(new Vec3(x, y, z), false)
    //   const key = `${x},${y},${z}`
    //   const mesh = this.sectionObjects[key]
    //   if (mesh) {
    //     this.scene.remove(mesh)
    //     dispose3(mesh)
    //   }
    //   delete this.sectionObjects[key]
    // }
  }

}
