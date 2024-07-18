import { useEffect, useState } from 'react'
import { Vec3 } from 'vec3'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'
import { TypedEventEmitter } from 'contro-max/build/typedEventEmitter'
import BlockData from '../../prismarine-viewer/viewer/lib/moreBlockDataGenerated.json'
import { Block } from 'prismarine-block'
import { PCChunk } from 'prismarine-chunk'
import { contro } from '../controls'
import Minimap from './Minimap'
import { DrawerAdapter, MapUpdates } from './MinimapDrawer'

export class DrawerAdapterImpl extends TypedEventEmitter<MapUpdates> implements DrawerAdapter {
  playerPosition: Vec3
  yaw: number
  warps: WorldWarp[]
  world: string
  currChunk: PCChunk | undefined
  currChunkPos: { x: number, z: number }

  constructor(pos?: Vec3, warps?: WorldWarp[]) {
    super()
    this.playerPosition = pos ?? new Vec3(0, 0, 0)
    this.warps = warps ?? [] as WorldWarp[]
  }

  async getHighestBlockColor(x: number, z: number) {
    let block = null as Block | null
    let { height } = (bot.game as any)
    const airBlocks = new Set(['air', 'cave_air', 'void_air'])
    const chunkX = Math.floor(x / 16)
    const chunkZ = Math.floor(z / 16)
    let dataSource: { getBlock: (pos: Vec3) => Block | null } | undefined
    if (localServer) {
      if (this.currChunkPos.x === chunkX && this.currChunkPos.z === chunkZ) {
        dataSource = this.currChunk
      } else {
        dataSource = await this.getChunkSingleplayer(chunkX, chunkZ)
        this.currChunk = dataSource as PCChunk
        this.currChunkPos.x = chunkX
        this.currChunkPos.z = chunkZ
      }
    } else {
      dataSource = bot.world
    }
    do {
      block = dataSource?.getBlock(new Vec3(x, height, z)) ?? null
      height -= 1
      if (height < (bot.game as any).minY) return 'rgb(173, 216, 230)'
    } while (airBlocks.has(block?.name ?? ''))
    const color = block ? BlockData.colors[block.name] ?? 'rgb(211, 211, 211)' : 'rgb(255, 255, 255)'
    const blockUp = bot.world.getBlock(new Vec3(x, height + 2, z - 1))
    const blockRight = bot.world.getBlock(new Vec3(x + 1, height + 2, z))
    const blockRightUp = bot.world.getBlock(new Vec3(x + 1, height + 2, z - 1))
    if ((blockUp && !airBlocks.has(blockUp.name))
      || (blockRight && !airBlocks.has(blockRight.name))
      || (blockRightUp && !airBlocks.has(blockRightUp.name))
    ) {
      let rgbArray = color.match(/\d+/g).map(Number)
      if (rgbArray.length !== 3) return color
      rgbArray = rgbArray.map(element => {
        let newColor = element - 20
        if (newColor < 0) newColor = 0
        return newColor
      })
      return `rgb(${rgbArray.join(',')})`
    }
    const blockDown = bot.world.getBlock(new Vec3(x, height + 2, z + 1))
    const blockLeft = bot.world.getBlock(new Vec3(x - 1, height + 2, z))
    const blockLeftDown = bot.world.getBlock(new Vec3(x - 1, height + 2, z + 1))
    if ((blockDown && !airBlocks.has(blockDown.name))
      || (blockLeft && !airBlocks.has(blockLeft.name))
      || (blockLeftDown && !airBlocks.has(blockLeftDown.name))
    ) {
      let rgbArray = color.match(/\d+/g).map(Number)
      if (rgbArray.length !== 3) return color
      rgbArray = rgbArray.map(element => {
        let newColor = element + 20
        if (newColor > 255) newColor = 255
        return newColor
      })
      return `rgb(${rgbArray.join(',')})`
    }
    return color
  }

  setWarp(name: string, pos: Vec3, color: string, disabled: boolean, world?: string): void {
    this.world = bot.game.dimension
    const warp: WorldWarp = { name, x: pos.x, y: pos.y, z: pos.z, world: world ?? this.world, color, disabled }
    const index = this.warps.findIndex(w => w.name === name)
    if (index === -1) {
      this.warps.push(warp)
    } else {
      this.warps[index] = warp
    }
    // if (localServer) void localServer.setWarp(warp)
    this.emit('updateWarps')
  }

  async getChunkSingleplayer(chunkX: number, chunkZ: number) {
    // absolute coords
    const region = (localServer!.overworld.storageProvider as any).getRegion(chunkX * 16, chunkZ * 16)
    if (!region) return
    const chunk = await localServer!.players[0]!.world.getColumn(chunkX, chunkZ)
    return chunk
  }
}

export default () => {
  const [adapter] = useState(() => new DrawerAdapterImpl(bot.entity.position, localServer?.warps))

  const updateMap = () => {
    if (!adapter) return
    adapter.playerPosition = bot.entity.position
    adapter.yaw = bot.entity.yaw
    adapter.emit('updateMap')
  }

  const toggleFullMap = ({ command }) => {
    if (!adapter) return
    if (command === 'ui.toggleMap') adapter.emit('toggleFullMap')
  }

  useEffect(() => {
    bot.on('move', updateMap)

    contro.on('trigger', toggleFullMap)

    return () => {
      bot.off('move', updateMap)
      contro.off('trigger', toggleFullMap)
    }
  }, [])

  return <div>
    <Minimap adapter={adapter} />
  </div>
}
