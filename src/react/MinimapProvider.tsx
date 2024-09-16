import fs from 'fs'
import { useEffect, useState } from 'react'
import { versions } from 'minecraft-data'
import { simplify } from 'prismarine-nbt'
import RegionFile from 'prismarine-provider-anvil/src/region'
import { Vec3 } from 'vec3'
import { versionToNumber } from 'prismarine-viewer/viewer/prepare/utils'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'
import { TypedEventEmitter } from 'contro-max/build/typedEventEmitter'
import { PCChunk } from 'prismarine-chunk'
import { Chunk } from 'prismarine-world/types/world'
import { INVISIBLE_BLOCKS } from 'prismarine-viewer/viewer/lib/mesher/worldConstants'
import { getRenamedData } from 'flying-squid/dist/blockRenames'
import { useSnapshot } from 'valtio'
import BlockData from '../../prismarine-viewer/viewer/lib/moreBlockDataGenerated.json'
import preflatMap from '../preflatMap.json'
import { contro } from '../controls'
import { gameAdditionalState, showModal, hideModal, miscUiState, loadedGameState, activeModalStack } from '../globalState'
import { options } from '../optionsStorage'
import Minimap, { DisplayMode } from './Minimap'
import { DrawerAdapter, MapUpdates } from './MinimapDrawer'
import { useIsModalActive } from './utilsApp'

const getBlockKey = (x: number, z: number) => {
  return `${x},${z}`
}

const findHeightMap = (obj: any): any => {
  function search (obj: any): any | undefined {
    for (const key in obj) {
      if (['heightmap', 'heightmaps'].includes(key.toLowerCase())) {
        return obj[key]
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        const result = search(obj[key])
        if (result !== undefined) {
          return result
        }
      }
    }
  }
  return search(obj)
}

export class DrawerAdapterImpl extends TypedEventEmitter<MapUpdates> implements DrawerAdapter {
  playerPosition: Vec3
  yaw: number
  warps: WorldWarp[]
  world: string
  chunksStore: Record<string, Chunk | null | 'unavailable'> = {}
  loadingChunksCount = 0
  loadingChunksQueue = new Set<string>()
  currChunk: PCChunk | undefined
  currChunkPos: { x: number, z: number } = { x: 0, z: 0 }
  isOldVersion: boolean
  blockData: any
  heightMap: Record<string, number> = {}
  regions: Record<string, RegionFile> = {}
  chunksHeightmaps: Record<string, any> = {}

  constructor (pos?: Vec3) {
    super()
    this.playerPosition = pos ?? new Vec3(0, 0, 0)
    this.warps = gameAdditionalState.warps
    if (localServer) {
      this.overwriteWarps(localServer.warps)
      this.on('cellReady', (key: string) => {
        if (this.loadingChunksQueue.size === 0) return
        const [x, z] = this.loadingChunksQueue.values().next().value.split(',').map(Number)
        this.loadChunk(x, z)
        this.loadingChunksQueue.delete(`${x},${z}`)
      })
    } else {
      const storageWarps = localStorage.getItem(`warps: ${loadedGameState.username} ${loadedGameState.serverIp ?? ''}`)
      this.overwriteWarps(JSON.parse(storageWarps ?? '[]'))
    }
    this.isOldVersion = versionToNumber(bot.version) < versionToNumber('1.13')
    this.blockData = {}
    for (const blockKey of Object.keys(BlockData.colors)) {
      const renamedKey = getRenamedData('blocks', blockKey, '1.20.2', bot.version)
      this.blockData[renamedKey as string] = BlockData.colors[blockKey]

    }
  }

  overwriteWarps (newWarps: WorldWarp[]) {
    this.warps.splice(0, this.warps.length)
    for (const warp of newWarps) {
      this.warps.push({ ...warp })
    }
  }

  async getHighestBlockColor (x: number, z: number, full?: boolean) {
    const chunkX = Math.floor(x / 16) * 16
    const chunkZ = Math.floor(z / 16) * 16
    const emptyColor = 'rgb(200, 200, 200)'
    if (localServer && full) {
      const chunk = this.chunksStore[`${chunkX},${chunkZ}`]
      if (chunk === undefined) {
        if (this.loadingChunksCount > 19) {
          this.loadingChunksQueue.add(`${chunkX},${chunkZ}`)
          return emptyColor
        }
        this.chunksStore[`${chunkX},${chunkZ}`] = null
        this.loadingChunksCount += 1
        console.log('[minimap] loading:', chunkX, chunkZ)
        this.loadChunk(chunkX, chunkZ)
        return emptyColor
      }
      return this.getHighestBlockColorLocalServer(x, z)
    }
    if (!viewer.world.finishedChunks[`${chunkX},${chunkZ}`]) return emptyColor
    const block = viewer.world.highestBlocks[`${x},${z}`]
    const blockData = bot.world.getBlock(new Vec3(x, block?.y ?? 0, z))
    const color = block && blockData ? (this.isOldVersion ? BlockData.colors[preflatMap.blocks[`${blockData.type}:${blockData.metadata}`]?.replaceAll(/\[.*?]/g, '')] : this.blockData[block.name]) ?? 'rgb(211, 211, 211)' : emptyColor
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
    if ((blockUp && !INVISIBLE_BLOCKS.has(blockUp.name))
      || (blockRight && !INVISIBLE_BLOCKS.has(blockRight.name))
      || (blockRightUp && !INVISIBLE_BLOCKS.has(blockRightUp.name))
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
    if ((blockDown && !INVISIBLE_BLOCKS.has(blockDown.name))
      || (blockLeft && !INVISIBLE_BLOCKS.has(blockLeft.name))
      || (blockLeftDown && !INVISIBLE_BLOCKS.has(blockLeftDown.name))
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
    switch (chunk) {
      case undefined:
        return emptyColor
      case null:
        return emptyColor
      case 'unavailable':
        return 'rgba(0, 0, 0, 0)'
      default:
        break
    }
    const y = this.getHighestBlockY(x, z, chunk)
    this.heightMap[getBlockKey(x, z)] = y
    const block = chunk.getBlock(new Vec3(x & 15, y, z & 15))
    const color = block ? (this.isOldVersion ? BlockData.colors[preflatMap.blocks[`${block.type}:${block.metadata}`]?.replaceAll(/\[.*?]/g, '')] : this.blockData[block.name]) ?? 'rgb(211, 211, 211)' : emptyColor
    if (!block) return color

    // shadows
    const blockUp = this.heightMap[getBlockKey(x, z - 1)]
    const blockRight = this.heightMap[getBlockKey(x + 1, z)]
    const blockRightUp = this.heightMap[getBlockKey(x + 1, z - 1)]
    if ((blockUp > y)
      || (blockRight > y)
      || (blockRightUp > y)
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
    const blockDown = this.heightMap[getBlockKey(x, z + 1)]
    const blockLeft = this.heightMap[getBlockKey(x - 1, z)]
    const blockLeftDown = this.heightMap[getBlockKey(x - 1, z + 1)]
    if ((blockDown > y)
      || (blockLeft > y)
      || (blockLeftDown > y)
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

  async getChunkHeightMapFromRegion (chunkX: number, chunkZ: number, cb?: (hm: number[]) => void) {
    const regionX = Math.floor(chunkX / 32)
    const regionZ = Math.floor(chunkZ / 32)
    const { worldFolder } = localServer!.options
    const path = `${worldFolder}/region/r.${regionX}.${regionZ}.mca`
    if (!this.regions[`${regionX},${regionZ}`]) {
      const region = new RegionFile(path)
      await region.initialize()
      this.regions[`${regionX},${regionZ}`] = region
    }
    const rawChunk = await this.regions[`${regionX},${regionZ}`].read(chunkX - regionX * 32, chunkZ - regionZ * 32)
    const chunk = simplify(rawChunk as any)
    console.log(`chunk ${chunkX}, ${chunkZ}:`, chunk)
    const heightmap = findHeightMap(chunk)
    console.log(`heightmap ${chunkX}, ${chunkZ}:`, heightmap)
    this.chunksHeightmaps[`${chunkX * 16},${chunkZ * 16}`] = heightmap
    cb?.(heightmap)
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
    const chunkX = Math.floor(x / 16) * 16
    const chunkZ = Math.floor(z / 16) * 16
    if (this.chunksHeightmaps[`${chunkX},${chunkZ}`]) {
      return this.chunksHeightmaps[`${chunkX},${chunkZ}`][x + z - chunkX - chunkZ]
    }
    const source = chunk ?? bot.world
    const { height, minY } = (bot.game as any)
    for (let i = height; i > 0; i -= 1) {
      const block = source.getBlock(new Vec3(x & 15, minY + i, z & 15))
      if (block && !INVISIBLE_BLOCKS.has(block.name)) {
        return minY + i
      }
    }
    return minY
  }

  async getChunkSingleplayer (chunkX: number, chunkZ: number) {
    // absolute coords
    const region = (localServer!.overworld.storageProvider as any).getRegion(chunkX, chunkZ)
    if (!region) return 'unavailable'
    const chunk = await localServer!.players[0]!.world.getColumn(chunkX / 16, chunkZ / 16)
    return chunk
  }

  loadChunk (chunkX: number, chunkZ: number) {
    void this.getChunkHeightMapFromRegion(chunkX / 16, chunkZ / 16)
    this.getChunkSingleplayer(chunkX, chunkZ).then(
      (res) => {
        this.chunksStore[`${chunkX},${chunkZ}`] = res
        this.emit(`cellReady`, `${chunkX},${chunkZ}`)
        this.loadingChunksCount -= 1
        console.log('[minimap] loaded:', chunkX, chunkZ, res)
      }
    ).catch((err) => { console.warn('[minimap] failed to get chunk:', chunkX, chunkZ) })
  }

  clearChunksStore (x: number, z: number) {
    for (const key of Object.keys(this.chunksStore)) {
      const [chunkX, chunkZ] = key.split(',').map(Number)
      if (Math.hypot((chunkX - x), (chunkZ - z)) > 300) {
        delete this.chunksStore[key]
        delete this.chunksHeightmaps[key]
        for (let i = 0; i < 16; i += 1) {
          for (let j = 0; j < 16; j += 1) {
            delete this.heightMap[`${chunkX + i},${chunkZ + j}`]
          }
        }
      }
    }
  }

  quickTp (x: number, z: number) {
    const y = this.getHighestBlockY(x, z)
    bot.chat(`/tp ${x} ${y + 20} ${z}`)
    const timeout = setTimeout(() => {
      const y = this.getHighestBlockY(x, z)
      bot.chat(`/tp ${x} ${y + 20} ${z}`)
      clearTimeout(timeout)
    }, 500)
  }
}

const Inner = ({ displayMode }: { displayMode?: DisplayMode }) => {
  const [adapter] = useState(() => new DrawerAdapterImpl(bot.entity.position))

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

  useEffect(() => {
    bot.on('move', updateMap)
    localServer?.on('warpsUpdated' as keyof ServerEvents, updateWarps)

    return () => {
      bot?.off('move', updateMap)
      localServer?.off('warpsUpdated' as keyof ServerEvents, updateWarps)
    }
  }, [])

  return <div>
    <Minimap
      adapter={adapter}
      showMinimap={options.showMinimap}
      showFullmap='always'
      singleplayer={miscUiState.singleplayer}
      fullMap={displayMode === 'fullmapOnly'}
      toggleFullMap={() => {
        hideModal()
      }}
      displayMode={displayMode}
    />
  </div>
}

export default ({ displayMode }: { displayMode?: DisplayMode }) => {
  const { showMinimap } = useSnapshot(options)
  const fullMapOpened = useIsModalActive('full-map')

  const readChunksHeightMaps = async () => {
    const { worldFolder } = localServer!.options
    const path = `${worldFolder}/region/r.0.0.mca`
    const region = new RegionFile(path)
    await region.initialize()
    const chunks: Record<string, any> = {}
    console.log('Reading chunks...')
    console.log(chunks)
    let versionDetected = false
    for (const [i, _] of Array.from({ length: 32 }).entries()) {
      for (const [k, _] of Array.from({ length: 32 }).entries()) {
        // todo, may use faster reading, but features is not commonly used
        // eslint-disable-next-line no-await-in-loop
        const nbt = await region.read(i, k)
        chunks[`${i},${k}`] = nbt
        if (nbt && !versionDetected) {
          const simplified = simplify(nbt)
          const version = versions.pc.find(x => x['dataVersion'] === simplified.DataVersion)?.minecraftVersion
          console.log('Detected version', version ?? 'unknown')
          versionDetected = true
        }
      }
    }
    Object.defineProperty(chunks, 'simplified', {
      get () {
        const mapped = {}
        for (const [i, _] of Array.from({ length: 32 }).entries()) {
          for (const [k, _] of Array.from({ length: 32 }).entries()) {
            const key = `${i},${k}`
            const chunk = chunks[key]
            if (!chunk) continue
            mapped[key] = simplify(chunk)
          }
        }
        return mapped
      },
    })
    console.log('Done!', chunks)
  }

  useEffect(() => {
    if (displayMode !== 'fullmapOnly') return
    const toggleFullMap = ({ command }: { command?: string }) => {
      if (command === 'ui.toggleMap') {
        if (activeModalStack.at(-1)?.reactType === 'full-map') {
          hideModal({ reactType: 'full-map' })
        } else {
          showModal({ reactType: 'full-map' })
        }
      }
    }
    contro?.on('trigger', toggleFullMap)
    return () => {
      contro?.off('trigger', toggleFullMap)
    }
  }, [])

  if (
    displayMode === 'minimapOnly'
      ? showMinimap === 'never' || (showMinimap === 'singleplayer' && !miscUiState.singleplayer)
      : !fullMapOpened
  ) {
    return null
  }

  return <Inner displayMode={displayMode} />
}
