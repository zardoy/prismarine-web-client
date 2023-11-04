import Chunks from 'prismarine-chunk'
import mcData from 'minecraft-data'
import { Block } from "prismarine-block"
import { Vec3 } from 'vec3'

function columnKey (x, z) {
  return `${x},${z}`
}

function posInChunk (pos) {
  pos = pos.floored()
  pos.x &= 15
  pos.z &= 15
  return pos
}

function isCube (shapes) {
  if (!shapes || shapes.length !== 1) return false
  const shape = shapes[0]
  return shape[0] === 0 && shape[1] === 0 && shape[2] === 0 && shape[3] === 1 && shape[4] === 1 && shape[5] === 1
}

export type WorldBlock = Block & {
  variant?: any
  // todo
  isCube: boolean
}

export class World {
  Chunk: any/* import('prismarine-chunk/types/index').PCChunk */
  columns = {}
  blockCache = {}
  biomeCache: { [id: number]: mcData.Biome }

  constructor (version) {
    this.Chunk = Chunks(version)
    this.biomeCache = mcData(version).biomes
  }

  addColumn (x, z, json) {
    const chunk = this.Chunk.fromJson(json)
    this.columns[columnKey(x, z)] = chunk
    return chunk
  }

  removeColumn (x, z) {
    delete this.columns[columnKey(x, z)]
  }

  getColumn (x, z) {
    return this.columns[columnKey(x, z)]
  }

  setBlockStateId (pos: Vec3, stateId) {
    const key = columnKey(Math.floor(pos.x / 16) * 16, Math.floor(pos.z / 16) * 16)

    const column = this.columns[key]
    // null column means chunk not loaded
    if (!column) return false

    column.setBlockStateId(posInChunk(pos.floored()), stateId)

    return true
  }

  getBlock (pos: Vec3): WorldBlock | null {
    const key = columnKey(Math.floor(pos.x / 16) * 16, Math.floor(pos.z / 16) * 16)

    const column = this.columns[key]
    // null column means chunk not loaded
    if (!column) return null

    const loc = pos.floored()
    const locInChunk = posInChunk(loc)
    const stateId = column.getBlockStateId(locInChunk)

    if (!this.blockCache[stateId]) {
      const b = column.getBlock(locInChunk)
      b.isCube = isCube(b.shapes)
      this.blockCache[stateId] = b
    }

    const block = this.blockCache[stateId]
    block.position = loc
    block.biome = this.biomeCache[column.getBiome(locInChunk)]
    if (block.name === 'redstone_ore') block.transparent = false
    return block
  }

  shouldMakeAo (block: WorldBlock | null) {
    return block?.isCube && block.name !== 'barrier'
  }
}
