import { useEffect, useRef } from 'react'
import { Vec3 } from 'vec3'
import BlockData from '../../prismarine-viewer/viewer/lib/moreBlockDataGenerated.json'
import Minimap from './Minimap'
import { DrawerAdapter } from './MinimapDrawer'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'
import { TypedEventEmitter } from 'contro-max/build/typedEventEmitter'
import { contro } from '../controls'

class DrawerAdapterImpl extends TypedEventEmitter<{
  updateBlockColor: (pos: Vec3) => void
  updatePlayerPosition: () => void
  updateWarps: () => void
}> implements DrawerAdapter {
  playerPosition: Vec3
  warps: WorldWarp[]

  constructor(pos?: Vec3, warps?: WorldWarp[]) {
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

  setWarp(name: string, pos: Vec3, world: string, color: string, disabled: boolean): void {
    const warp: WorldWarp = { name, x: pos.x, y: pos.y, z: pos.z, world, color, disabled }
    const index = this.warps.findIndex(w => w.name === name)
    if (index !== -1) {
      this.warps[index] = warp
    } else {
      this.warps.push(warp)
    }
    this.emit('updateWarps')
  }
}

export default () => {
  const adapter = useRef<DrawerAdapterImpl | null>(null)

  const updateMap = () => {
    if (!adapter.current) return
    adapter.current.playerPosition = bot.entity.position
    adapter.current.emit('updateMap')
  }

  const toggleFullMap = ({ command }) => {
    if (!adapter.current) return
    if (command === 'ui.toggleMap') adapter.current.emit('toggleFullMap')
  }

  useEffect(() => {
    adapter.current = new DrawerAdapterImpl(bot.entity.position)
  }, [])

  useEffect(() => {
    bot.on('move', updateMap)

    contro.on('trigger', toggleFullMap)

    return () => {
      bot.off('move', updateMap)
      contro.off('trigger', toggleFullMap)
    }
  }, [])

  return <div>
    <Minimap adapter={adapter.current} />
  </div>
}
