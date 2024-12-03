import { BlockFaceType, BlockType, makeError } from './shared'

export type BlockWithWebgpuData = [number, number, number, BlockType]

export class ChunksStorage {
  allBlocks = [] as Array<BlockWithWebgpuData | undefined>
  chunks = [] as Array<{ length: number, free: boolean, x: number, z: number }>
  chunksMap = new Map<string, number>()
  // flatBuffer = new Uint32Array()

  awaitingUpdateStart: number | undefined
  awaitingUpdateEnd: number | undefined
  // dataSize = 0
  lastFetchedSize = 0

  get dataSize () {
    return this.allBlocks.length
  }

  findBelongingChunk (blockIndex: number) {
    let currentStart = 0
    let i = 0
    for (const chunk of this.chunks) {
      const { length: chunkLength } = chunk
      currentStart += chunkLength
      if (blockIndex < currentStart) {
        return {
          chunk,
          index: i
        }
      }
      i++
    }
  }

  getDataForBuffers () {
    this.lastFetchedSize = this.dataSize
    if (this.awaitingUpdateStart === undefined) return
    const { awaitingUpdateStart } = this
    const awaitingUpdateEnd = this.awaitingUpdateEnd!
    this.awaitingUpdateStart = undefined
    this.awaitingUpdateEnd = undefined
    return {
      allBlocks: this.allBlocks,
      chunks: this.chunks,
      awaitingUpdateStart,
      awaitingUpdateSize: awaitingUpdateEnd - awaitingUpdateStart,
    }
  }

  clearData () {
    this.chunks = []
    this.allBlocks = []
    this.awaitingUpdateStart = undefined
    this.awaitingUpdateEnd = undefined
  }

  addBlocksData (start: number, newData: typeof this.allBlocks) {
    let i = 0
    while (i < newData.length) {
      this.allBlocks.splice(start + i, 0, ...newData.slice(i, i + 1024))
      i += 1024
    }
  }

  getAvailableChunk (size: number) {
    let currentStart = 0
    let usingChunk: typeof this.chunks[0] | undefined
    for (const chunk of this.chunks) {
      const { length: chunkLength, free } = chunk
      currentStart += chunkLength
      if (!free) continue
      if (chunkLength >= size) {
        usingChunk = chunk
        usingChunk.free = false
        break
      }
    }

    if (!usingChunk) {
      const newChunk = {
        length: size,
        free: false,
        x: -1,
        z: -1
      }
      this.chunks.push(newChunk)
      usingChunk = newChunk
    }

    return {
      chunk: usingChunk,
      start: currentStart
    }
  }

  removeChunk (chunkPosKey: string) {
    if (!this.chunksMap.has(chunkPosKey)) return
    let currentStart = 0
    const chunkIndex = this.chunksMap.get(chunkPosKey)!
    const chunk = this.chunks[chunkIndex]
    for (let i = 0; i <= chunkIndex; i++) {
      const chunk = this.chunks[i]!
      currentStart += chunk.length
    }

    this.addBlocksData(currentStart, Array.from({ length: chunk.length }).map(() => undefined)) // empty data, will be filled with 0
    chunk.free = true
    this.chunksMap.delete(chunkPosKey)
    // try merge backwards
    for (let i = chunkIndex - 1; i >= 0; i--) {
      const chunk = this.chunks[i]!
      if (!chunk.free) break
      chunk.length += this.chunks[i]!.length
      this.chunks.splice(i, 1)
    }
    // try merge forwards
    for (let i = chunkIndex + 1; i < this.chunks.length; i++) {
      const chunk = this.chunks[i]!
      if (!chunk.free) break
      chunk.length += this.chunks[i]!.length
      this.chunks.splice(i, 1)
      i--
    }
  }

  addChunk (blocks: Record<string, BlockType>, rawPosKey: string) {
    this.removeChunk(rawPosKey)

    const [xSection, ySection, zSection] = rawPosKey.split(',').map(Number)
    const chunkPosKey = `${xSection / 16},${ySection / 16},${zSection / 16}`

    const newData = Object.entries(blocks).map(([key, value]) => {
      const [x, y, z] = key.split(',').map(Number)
      const block = value
      // return block.faces.map((side) => {
      const xRel = Math.abs(x % 16)
      const zRel = Math.abs(z % 16)
      return [xRel, y, zRel, block] satisfies BlockWithWebgpuData
    })

    const { chunk, start } = this.getAvailableChunk(newData.length)
    chunk.x = xSection / 16
    chunk.z = zSection / 16
    this.chunksMap.set(rawPosKey, this.chunks.indexOf(chunk))

    this.addBlocksData(start, newData)
    this.awaitingUpdateStart = Math.min(this.awaitingUpdateStart ?? Infinity, start)
    this.awaitingUpdateEnd = Math.max(this.awaitingUpdateEnd ?? -Infinity, start + newData.length)
  }
}
