import { useEffect, useState } from 'react'
import { Vec3 } from 'vec3'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'
import { TypedEventEmitter } from 'contro-max/build/typedEventEmitter'
import BlockData from '../../prismarine-viewer/viewer/lib/moreBlockDataGenerated.json'
import { contro } from '../controls'
import Minimap from './Minimap'
import { DrawerAdapter, MapUpdates } from './MinimapDrawer'

export class DrawerAdapterImpl extends TypedEventEmitter<MapUpdates> implements DrawerAdapter {
  playerPosition: Vec3
  warps: WorldWarp[]
  world: string

  constructor (pos?: Vec3, warps?: WorldWarp[]) {
    super()
    this.playerPosition = pos ?? new Vec3(0, 0, 0) 
    this.warps = warps ?? [] as WorldWarp[]
  }

  getHighestBlockColor (x: number, z:number) {
    let block = null as import('prismarine-block').Block | null
    let { height } = (bot.game as any)
    const airBlocks = new Set(['air', 'cave_air', 'void_air'])
    do {
      block = bot.world.getBlock(new Vec3(x, height, z))
      height -= 1
    } while (airBlocks.has(block?.name ?? ''))
    const color = BlockData.colors[block?.name ?? ''] ?? 'white'
    return color
  }

  setWarp (name: string, pos: Vec3, color: string, disabled: boolean, world?: string): void {
    this.world = bot.game.dimension
    const warp: WorldWarp = { name, x: pos.x, y: pos.y, z: pos.z, world: world ?? this.world, color, disabled }
    const index = this.warps.findIndex(w => w.name === name)
    if (index === -1) {
      this.warps.push(warp)
    } else {
      this.warps[index] = warp
    }
    if (localServer) void localServer.setWarp(warp)
    this.emit('updateWarps')
    // console.log('local server warps:', localServer?.warps)
    // console.log('adapter warps:', this.warps)
  }
}

export default () => {
  const [adapter] = useState(() => new DrawerAdapterImpl(bot.entity.position))

  const updateMap = () => {
    if (!adapter) return
    adapter.playerPosition = bot.entity.position
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
