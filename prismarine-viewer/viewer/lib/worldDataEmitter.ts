import { chunkPos } from './simpleUtils'

// todo refactor into its own commons module
import { generateSpiralMatrix, ViewRect } from 'flying-squid/src/utils'
import { Vec3 } from 'vec3'
import { EventEmitter } from 'events'

export type ChunkPosKey = string
type ChunkPos = { x: number, z: number }

/**
 * Usually connects to mineflayer bot and emits world data (chunks, entities)
 * It's up to the consumer to serialize the data if needed
 */
export class WorldDataEmitter extends EventEmitter {
  private loadedChunks: Record<ChunkPosKey, boolean>
  private lastPos: Vec3
  private eventListeners: Record<string, any> = {};
  private emitter: WorldDataEmitter

  constructor(public world: import('prismarine-world').world.World | typeof __type_bot['world'], public viewDistance: number, position: Vec3 = new Vec3(0, 0, 0)) {
    super()
    this.loadedChunks = {}
    this.lastPos = new Vec3(0, 0, 0).update(position)
    // todo
    this.emitter = this

    this.emitter.on('mouseClick', async (click) => {
      const ori = new Vec3(click.origin.x, click.origin.y, click.origin.z)
      const dir = new Vec3(click.direction.x, click.direction.y, click.direction.z)
      const block = this.world.raycast(ori, dir, 256)
      if (!block) return
      //@ts-ignore
      this.emit('blockClicked', block, block.face, click.button)
    })
  }

  listenToBot (bot: typeof __type_bot) {
    this.eventListeners[bot.username] = {
      // 'move': botPosition,
      entitySpawn: (e: any) => {
        if (e === bot.entity) return
        this.emitter.emit('entity', { id: e.id, name: e.name, pos: e.position, width: e.width, height: e.height, username: e.username })
      },
      entityMoved: (e: any) => {
        this.emitter.emit('entity', { id: e.id, pos: e.position, pitch: e.pitch, yaw: e.yaw })
      },
      entityGone: (e: any) => {
        this.emitter.emit('entity', { id: e.id, delete: true })
      },
      chunkColumnLoad: (pos: Vec3) => {
        this.loadChunk(pos)
      },
      blockUpdate: (oldBlock: any, newBlock: any) => {
        const stateId = newBlock.stateId ? newBlock.stateId : ((newBlock.type << 4) | newBlock.metadata)
        this.emitter.emit('blockUpdate', { pos: oldBlock.position, stateId })
      }
    }

    this.emitter.on('listening', () => {
      this.emitter.emit('blockEntities', new Proxy({}, {
        get (_target, posKey, receiver) {
          if (typeof posKey !== 'string') return
          const [x, y, z] = posKey.split(',').map(Number)
          return bot.world.getBlock(new Vec3(x, y, z)).entity
        },
      }))
    })
    // node.js stream data event pattern
    if (this.emitter.listenerCount('blockEntities')) {
      this.emitter.emit('listening')
    }

    for (const [evt, listener] of Object.entries(this.eventListeners[bot.username])) {
      bot.on(evt as any, listener)
    }

    for (const id in bot.entities) {
      const e = bot.entities[id]
      if (e && e !== bot.entity) {
        this.emitter.emit('entity', { id: e.id, name: e.name, pos: e.position, width: e.width, height: e.height, username: e.username })
      }
    }
  }

  removeListenersFromBot (bot: import('mineflayer').Bot) {
    for (const [evt, listener] of Object.entries(this.eventListeners[bot.username])) {
      bot.removeListener(evt as any, listener)
    }
    delete this.eventListeners[bot.username]
  }

  async init (pos: Vec3) {
    this.emitter.emit('chunkPosUpdate', { pos })
    const [botX, botZ] = chunkPos(pos)

    const positions = generateSpiralMatrix(this.viewDistance).map(([x, z]) => new Vec3((botX + x) * 16, 0, (botZ + z) * 16))

    this.lastPos.update(pos)
    await this._loadChunks(positions)
  }

  async _loadChunks (positions: Vec3[], sliceSize = 5, waitTime = 0) {
    for (let i = 0; i < positions.length; i += sliceSize) {
      await new Promise((resolve) => setTimeout(resolve, waitTime))
      await Promise.all(positions.slice(i, i + sliceSize).map((p) => this.loadChunk(p)))
    }
  }

  async loadChunk (pos: ChunkPos) {
    const [botX, botZ] = chunkPos(this.lastPos)
    const dx = Math.abs(botX - Math.floor(pos.x / 16))
    const dz = Math.abs(botZ - Math.floor(pos.z / 16))
    if (dx <= this.viewDistance && dz <= this.viewDistance) {
      const column = await this.world.getColumnAt(pos['y'] ? pos as Vec3 : new Vec3(pos.x, 0, pos.z))
      if (column) {
        // todo optimize toJson data, make it clear why it is used
        const chunk = column.toJson()
        // TODO: blockEntities
        const worldConfig = {
          minY: column['minY'] ?? 0,
          worldHeight: column['worldHeight'] ?? 256,
        }
        //@ts-ignore
        this.emitter.emit('loadChunk', { x: pos.x, z: pos.z, chunk, blockEntities: column.blockEntities, worldConfig })
        this.loadedChunks[`${pos.x},${pos.z}`] = true
      }
    } else {
      console.debug('skipped loading chunk', dx, dz, '>', this.viewDistance)
    }
  }

  unloadChunk (pos: ChunkPos) {
    this.emitter.emit('unloadChunk', { x: pos.x, z: pos.z })
    delete this.loadedChunks[`${pos.x},${pos.z}`]
  }

  async updatePosition (pos: Vec3, force = false) {
    const [lastX, lastZ] = chunkPos(this.lastPos)
    const [botX, botZ] = chunkPos(pos)
    if (lastX !== botX || lastZ !== botZ || force) {
      this.emitter.emit('chunkPosUpdate', { pos })
      const newView = new ViewRect(botX, botZ, this.viewDistance)
      const chunksToUnload: Vec3[] = []
      for (const coords of Object.keys(this.loadedChunks)) {
        const x = parseInt(coords.split(',')[0])
        const z = parseInt(coords.split(',')[1])
        const p = new Vec3(x, 0, z)
        const [chunkX, chunkZ] = chunkPos(p)
        if (!newView.contains(chunkX, chunkZ)) {
          chunksToUnload.push(p)
        }
      }
      // todo @sa2urami
      console.log('unloading', chunksToUnload.length, 'total now', Object.keys(this.loadedChunks).length)
      for (const p of chunksToUnload) {
        this.unloadChunk(p)
      }
      const positions = generateSpiralMatrix(this.viewDistance).map(([x, z]) => {
        const pos = new Vec3((botX + x) * 16, 0, (botZ + z) * 16)
        if (!this.loadedChunks[`${pos.x},${pos.z}`]) return pos
        return undefined!
      }).filter(Boolean)
      this.lastPos.update(pos)
      await this._loadChunks(positions)
    } else {
      this.lastPos.update(pos)
    }
  }
}
