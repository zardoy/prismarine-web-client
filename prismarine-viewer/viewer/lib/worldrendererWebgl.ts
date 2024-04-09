import { addBlocksSection, removeBlocksSection, sendWorkerMessage } from '../../examples/webglRenderer'
import type { WebglData } from '../prepare/webglData'
import { loadJSON } from './utils.web'
import { WorldRendererCommon } from './worldrendererCommon'

export class WorldRendererWebgl extends WorldRendererCommon {
  newChunks = {} as Record<string, any>
  webglData: WebglData
  stopBlockUpdate = false

  constructor(numWorkers = 4) {
    super(numWorkers)
  }

  playgroundGetWebglData () {
    const playgroundChunk = Object.values(this.newChunks).filter((x: any) => Object.keys(x?.blocks ?? {}).length > 0)?.[0] as any
    if (!playgroundChunk) return
    const block = Object.values(playgroundChunk.blocks)?.[0] as any
    if (!block) return
    const { textureName } = block
    if (!textureName) return
    return this.webglData[textureName]
  }

  setBlockStateId (pos: any, stateId: any): void {
    if (this.stopBlockUpdate) return
    super.setBlockStateId(pos, stateId)
  }

  handleWorkerMessage (data: any): void {
    if (data.type === 'geometry' && Object.keys(data.geometry.blocks).length) {

      const chunkCoords = data.key.split(',')
      if (/* !this.loadedChunks[chunkCoords[0] + ',' + chunkCoords[2]] ||  */ !this.active) return

      addBlocksSection(data.key, data.geometry)
      // const blocks = Object.values(data.geometry.blocks) as any[]
      this.newChunks[data.key] = data.geometry
    }
  }

  chunksReset () {
    sendWorkerMessage({
      type: 'fullReset'
    })
  }

  updatePosDataChunk (key: string) {
  }

  updateTexturesData (): void {
    super.updateTexturesData()
    loadJSON(`/webgl/${this.texturesVersion}.json`, (json) => {
      this.webglData = json
    })
  }

  updateShowChunksBorder (value: boolean) {
    // todo
  }


  removeColumn (x, z) {
    return
    console.log('removeColumn', x, z)
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
