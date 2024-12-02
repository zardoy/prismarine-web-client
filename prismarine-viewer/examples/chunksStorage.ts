import { BlockFaceType, BlockType, makeError } from './shared'

export type BlockWithTiles = [number, number, number, BlockType]

const chunksArrIndexes = {}
// const freeArrayIndexes = [] as Array<[number, number]>
export class ChunksStorage {
  // allSides = [] as Array<BlockTile | undefined>
  chunkSides = new Map<string, BlockWithTiles[]>()
  // flatBuffer = new Uint32Array()
  lastNotUpdatedIndex
  lastNotUpdatedArrSize
  dataSize = 0
  lastFetchedSize = 0

  getDataForBuffers () {
    this.lastFetchedSize = this.dataSize
    return {
      allSides: this.chunkSides.values(),
      chunkSides: this.chunkSides
    }
  }

  clearData () {
    this.chunkSides.clear()
    this.dataSize = 0
  }

  addData (blocks: Record<string, BlockType>, rawPosKey: string) {
    const [xSection, ySection, zSection] = rawPosKey.split(',').map(Number)
    const chunkPosKey = `${xSection / 16},${ySection / 16},${zSection / 16}`

    const newData = Object.entries(blocks).map(([key, value]) => {
      const [x, y, z] = key.split(',').map(Number)
      const block = value
      // return block.faces.map((side) => {
      const xRel = Math.abs(x % 16)
      const zRel = Math.abs(z % 16)
      return [xRel, y, zRel, block] satisfies BlockWithTiles
    })

    this.chunkSides.set(chunkPosKey, newData)

    this.dataSize += newData.length

    // const currentLength = this.allSides.length

    // // in: object - name, out: [x, y, z, name]
    // // find freeIndexes if possible
    // const freeArea = freeArrayIndexes.find(([startIndex, endIndex]) => endIndex - startIndex >= newData.length)
    // if (freeArea) {
    //   const [startIndex, endIndex] = freeArea
    //   allSides.splice(startIndex, newData.length, ...newData)
    //   lastNotUpdatedIndex ??= startIndex
    //   const freeAreaIndex = freeArrayIndexes.indexOf(freeArea)
    //   freeArrayIndexes[freeAreaIndex] = [startIndex + newData.length, endIndex]
    //   if (freeArrayIndexes[freeAreaIndex][0] >= freeArrayIndexes[freeAreaIndex][1]) {
    //     freeArrayIndexes.splice(freeAreaIndex, 1)
    //     // todo merge
    //   }
    //   lastNotUpdatedArrSize = newData.length
    //   console.log('using free area', freeArea)
    // }

    // chunksArrIndexes[key] = [currentLength, currentLength + newData.length]

    // let i = 0
    // while (i < newData.length) {
    //   this.allSides.splice(currentLength + i, 0, ...newData.slice(i, i + 1024))
    //   i += 1024
    // }
    // const totalChunksLength = [...this.chunkSides.values()].reduce((a, x) => a + x.length, 0)
    // if (totalChunksLength !== this.allSides.length) {
    //   makeError(`totalChunksLength ${totalChunksLength} !== allSides.length ${this.allSides.length}`)
    // }
    // this.lastNotUpdatedIndex ??= currentLength
    this.lastNotUpdatedIndex = 0
    // if (webglRendererWorker && webglRendererWorker.notRenderedAdditions < 5) {
  }
}
