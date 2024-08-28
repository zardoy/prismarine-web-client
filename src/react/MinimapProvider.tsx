import { useEffect, useState } from 'react'
import { Vec3 } from 'vec3'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'
import { TypedEventEmitter } from 'contro-max/build/typedEventEmitter'
import { PCChunk } from 'prismarine-chunk'
import { Chunk } from 'prismarine-world/types/world'
import BlockData from '../../prismarine-viewer/viewer/lib/moreBlockDataGenerated.json'
import { contro } from '../controls'
import { warps, showModal, hideModal, miscUiState, loadedGameState } from '../globalState'
import { options } from '../optionsStorage'
import Minimap, { DisplayMode } from './Minimap'
import { DrawerAdapter, MapUpdates } from './MinimapDrawer'
import { useIsModalActive } from './utilsApp'


export class DrawerAdapterImpl extends TypedEventEmitter<MapUpdates> implements DrawerAdapter {
  playerPosition: Vec3
  yaw: number
  warps: WorldWarp[]
  world: string
  chunksStore: Record<string, Chunk | null> = {}
  loadingChunksCount = 0
  currChunk: PCChunk | undefined
  currChunkPos: { x: number, z: number } = { x: 0, z: 0 }

  constructor (pos?: Vec3) {
    super()
    this.playerPosition = pos ?? new Vec3(0, 0, 0)
    this.warps = warps
    if (localServer) {
      this.overwriteWarps(localServer.warps)
    } else {
      const storageWarps = localStorage.getItem(`warps: ${loadedGameState.username} ${loadedGameState.serverIp ?? ''}`)
      this.overwriteWarps(JSON.parse(storageWarps ?? '[]'))
    }
  }

  overwriteWarps (newWarps: WorldWarp[]) {
    this.warps.splice(0, this.warps.length)
    for (const warp of newWarps) {
      this.warps.push({ ...warp })
    }
  }

  async getHighestBlockColor (x: number, z: number) {
    const airBlocks = new Set(['air', 'void_air', 'cave_air', 'barrier'])
    const chunkX = Math.floor(x / 16) * 16
    const chunkZ = Math.floor(z / 16) * 16
    const emptyColor = 'rgb(200, 200, 200)'
    if (localServer) {
      const chunk = this.chunksStore[`${chunkX},${chunkZ}`]
      if (chunk === undefined) {
        if (this.loadingChunksCount > 19) return emptyColor
        this.chunksStore[`${chunkX},${chunkZ}`] = null
        this.loadingChunksCount += 1
        console.log('chunks loading:', this.loadingChunksCount)
        this.getChunkSingleplayer(chunkX, chunkZ).then(
          (res) => {
            this.chunksStore[`${chunkX},${chunkZ}`] = res
            this.loadingChunksCount -= 1
            console.log('chunks loading:', this.loadingChunksCount)
          }
        ).catch((err) => { console.warn('failed to get chunk:', chunkX, chunkZ) })
        return emptyColor
      }
      return this.getHighestBlockColorLocalServer(x, z)
    }
    if (!viewer.world.finishedChunks[`${chunkX},${chunkZ}`]) return emptyColor
    const block = viewer.world.highestBlocks[`${x},${z}`]
    const color = block ? BlockData.colors[block.name] ?? 'rgb(211, 211, 211)' : emptyColor
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

  async getHighestBlockColorLocalServer (x: number, z: number) {
    const emptyColor = 'rgb(200, 200, 200)'
    const chunkX = Math.floor(x / 16)
    const chunkZ = Math.floor(z / 16)
    const chunk = this.chunksStore[`${chunkX * 16},${chunkZ * 16}`]
    if (!chunk) return emptyColor
    const y = this.getHighestBlockY(x, z, chunk)
    const block = chunk.getBlock(new Vec3(x & 15, y, z & 15))
    const color = block ? BlockData.colors[block.name] ?? 'rgb(211, 211, 211)' : emptyColor
    return color
  }

  setWarp (warp: WorldWarp, remove?: boolean): void {
    this.world = bot.game.dimension
    const index = this.warps.findIndex(w => w.name === warp.name)
    if (index === -1) {
      this.warps.push(warp)
    } else if (remove && index !== -1) {
      this.warps.splice(index, 1)
    } else {
      this.warps[index] = warp
    }
    if (localServer) {
      // type suppressed until server is updated. It works fine
      void (localServer as any).setWarp(warp, remove)
    } else if (remove) {
      localStorage.removeItem(`warps: ${loadedGameState.username} ${loadedGameState.serverIp}`)
    } else {
      localStorage.setItem(`warps: ${loadedGameState.username} ${loadedGameState.serverIp}`, JSON.stringify(this.warps))
    }
    this.emit('updateWarps')
  }

  getHighestBlockY (x: number, z: number, chunk?: Chunk) {
    const { height, minY } = (bot.game as any)
    const transparentBlocks = new Set(['air', 'void_air', 'cave_air', 'barrier'])
    for (let i = height; i > 0; i -= 1) {
      const block = chunk ? chunk.getBlock(new Vec3(x & 15, minY + i, z & 15)) : bot.world.getBlock(new Vec3(x, minY + i, z))
      if (block && !transparentBlocks.has(block.name)) {
        return minY + i
      }
    }
    return minY
  }

  async getChunkSingleplayer (chunkX: number, chunkZ: number) {
    // absolute coords
    const region = (localServer!.overworld.storageProvider as any).getRegion(chunkX, chunkZ)
    if (!region) return null
    const chunk = await localServer!.players[0]!.world.getColumn(chunkX / 16, chunkZ / 16)
    return chunk
  }
}

export default ({ displayMode }: { displayMode?: DisplayMode }) => {
  const [adapter] = useState(() => new DrawerAdapterImpl(bot.entity.position))
  const fullMapOpened = useIsModalActive('full-map')

  const updateWarps = (newWarps: WorldWarp[] | Error) => {
    if (newWarps instanceof Error) {
      console.error('An error occurred:', newWarps.message)
      return
    }

    adapter.overwriteWarps(newWarps)
  }

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
    contro.on('trigger', toggleFullMap)
    localServer?.on('warpsUpdated' as keyof ServerEvents, updateWarps)

    return () => {
      bot?.off('move', updateMap)
      contro?.off('trigger', toggleFullMap)
      localServer?.off('warpsUpdated' as keyof ServerEvents, updateWarps)
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