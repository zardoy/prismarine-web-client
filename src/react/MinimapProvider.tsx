import { useEffect, useState } from 'react'
import { Vec3 } from 'vec3'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'
import { TypedEventEmitter } from 'contro-max/build/typedEventEmitter'
import { PCChunk } from 'prismarine-chunk'
import BlockData from '../../prismarine-viewer/viewer/lib/moreBlockDataGenerated.json'
import { contro } from '../controls'
import { warps, showModal, hideModal, miscUiState } from '../globalState'
import { options } from '../optionsStorage'
import Minimap, { DisplayMode } from './Minimap'
import { DrawerAdapter, MapUpdates } from './MinimapDrawer'
import { useIsModalActive } from './utilsApp'

export class DrawerAdapterImpl extends TypedEventEmitter<MapUpdates> implements DrawerAdapter {
  playerPosition: Vec3
  yaw: number
  warps: WorldWarp[]
  world: string
  currChunk: PCChunk | undefined
  currChunkPos: { x: number, z: number } = { x: 0, z: 0 }

  constructor (pos?: Vec3, initialWarps?: WorldWarp[]) {
    super()
    this.playerPosition = pos ?? new Vec3(0, 0, 0)
    this.warps = initialWarps ?? localServer?.warps ?? warps
  }

  async getHighestBlockColor (x: number, z: number) {
    const airBlocks = new Set(['air', 'cave_air', 'void_air'])
    const chunkX = Math.floor(x / 16) * 16
    const chunkZ = Math.floor(z / 16) * 16
    if (!viewer.world.finishedChunks[`${chunkX},${chunkZ}`]) return 'rgb(200, 200, 200)'
    const block = viewer.world.highestBlocks[`${x},${z}`]
    const color = block ? BlockData.colors[block.name] ?? 'rgb(211, 211, 211)' : 'rgb(200, 200, 200)'
    if (!block) return color

    // shadows
    const upKey = `${x},${z - 1}`
    const blockUp = viewer.world.highestBlocks[upKey] && viewer.world.highestBlocks[upKey].y > block.y
      ? viewer.world.highestBlocks[upKey]
      : null
    const rightKey = `${x + 1},${z}`
    const blockRight = viewer.world.highestBlocks[rightKey] && viewer.world.highestBlocks[rightKey].y > block.y
      ? viewer.world.highestBlocks[rightKey]
      : null
    const rightUpKey = `${x + 1},${z - 1}`
    const blockRightUp = viewer.world.highestBlocks[rightUpKey] && viewer.world.highestBlocks[rightUpKey].y > block.y
      ? viewer.world.highestBlocks[rightUpKey]
      : null
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
    const downKey = `${x},${z + 1}`
    const blockDown = viewer.world.highestBlocks[downKey] && viewer.world.highestBlocks[downKey].y > block.y
      ? viewer.world.highestBlocks[downKey]
      : null
    const leftKey = `${x - 1},${z}`
    const blockLeft = viewer.world.highestBlocks[leftKey] && viewer.world.highestBlocks[leftKey].y > block.y
      ? viewer.world.highestBlocks[leftKey]
      : null
    const leftDownKey = `${x - 1},${z + 1}`
    const blockLeftDown = viewer.world.highestBlocks[leftDownKey] && viewer.world.highestBlocks[leftDownKey].y > block.y
      ? viewer.world.highestBlocks[leftDownKey]
      : null
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

  setWarp (name: string, pos: Vec3, color: string, disabled: boolean, world?: string): void {
    this.world = bot.game.dimension
    const warp: WorldWarp = { name, x: pos.x, y: pos.y, z: pos.z, world: world ?? this.world, color, disabled }
    const index = this.warps.findIndex(w => w.name === name)
    if (index === -1) {
      this.warps.push(warp)
    } else {
      this.warps[index] = warp
    }
    if (localServer) {
      void localServer.setWarp(warp)
    }
    this.emit('updateWarps')
  }

  async getChunkSingleplayer (chunkX: number, chunkZ: number) {
    // absolute coords
    const region = (localServer!.overworld.storageProvider as any).getRegion(chunkX * 16, chunkZ * 16)
    if (!region) return
    const chunk = await localServer!.players[0]!.world.getColumn(chunkX, chunkZ)
    return chunk
  }
}

export default ({ displayMode }: { displayMode?: DisplayMode }) => {
  const [adapter] = useState(() => new DrawerAdapterImpl(bot.entity.position, localServer?.warps))
  const fullMapOpened = useIsModalActive('full-map')

  const updateMap = () => {
    if (!adapter) return
    adapter.playerPosition = bot.entity.position
    adapter.yaw = bot.entity.yaw
    adapter.emit('updateMap')
  }

  const toggleFullMap = ({ command }: { command?: string }) => {
    if (!adapter) return
    if (command === 'ui.toggleMap') {
      if (fullMapOpened) {
        hideModal({ reactType: 'full-map' })
      } else {
        showModal({ reactType: 'full-map' })
      }
    }
  }

  useEffect(() => {
    bot.on('move', updateMap)
    // bot._client.on('map_chunk', (data) => {
    //   console.log('x:', data.x, 'z:', data.z)
    //   console.log(data)
    //   console.log(longArrayToNumber((data as any).heightmaps.value.WORLD_SURFACE.value[0]))
    // })
    // viewer.world.renderUpdateEmitter.on('update', updateMap)
    contro.on('trigger', toggleFullMap)

    return () => {
      bot.off('move', updateMap)
      // viewer.world.renderUpdateEmitter.off('update', updateMap)
      contro.off('trigger', toggleFullMap)
    }
  }, [])

  if (options.showMinimap === 'never' && options.showFullmap === 'never') return null

  return <div>
    <Minimap
      adapter={adapter}
      showMinimap={options.showMinimap}
      showFullmap={options.showFullmap}
      singleplayer={miscUiState.singleplayer}
      fullMap={fullMapOpened}
      toggleFullMap={toggleFullMap}
      displayMode={displayMode}
    />
  </div>
}
