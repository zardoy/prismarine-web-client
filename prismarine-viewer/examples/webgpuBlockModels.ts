import { versionToNumber } from 'flying-squid/dist/utils'
import worldBlockProvider from 'mc-assets/dist/worldBlockProvider'
import PrismarineBlock, { Block } from 'prismarine-block'
import { IndexedBlock } from 'minecraft-data'
import { getPreflatBlock } from '../viewer/lib/mesher/getPreflatBlock'
import { WEBGPU_FULL_TEXTURES_LIMIT } from './webgpuRendererShared'

export const prepareCreateWebgpuBlocksModelsData = () => {
  const blocksMap = {
    'double_stone_slab': 'stone',
    'stone_slab': 'stone',
    'oak_stairs': 'planks',
    'stone_stairs': 'stone',
    'glass_pane': 'stained_glass',
    'brick_stairs': 'brick_block',
    'stone_brick_stairs': 'stonebrick',
    'nether_brick_stairs': 'nether_brick',
    'double_wooden_slab': 'planks',
    'wooden_slab': 'planks',
    'sandstone_stairs': 'sandstone',
    'cobblestone_wall': 'cobblestone',
    'quartz_stairs': 'quartz_block',
    'stained_glass_pane': 'stained_glass',
    'red_sandstone_stairs': 'red_sandstone',
    'stone_slab2': 'stone_slab',
    'purpur_stairs': 'purpur_block',
    'purpur_slab': 'purpur_block'
  }

  const isPreflat = versionToNumber(viewer.world.version!) < versionToNumber('1.13')
  const provider = worldBlockProvider(viewer.world.blockstatesModels, viewer.world.blocksAtlasParser?.atlasJson ?? viewer.world.blocksAtlases, 'latest')
  const PBlockOriginal = PrismarineBlock(viewer.world.version!)

  const interestedTextureTiles = new Set<string>()
  const blocksDataModelDebug = {} as AllBlocksDataModels
  const blocksDataModel = {} as AllBlocksDataModels
  const blocksProccessed = {} as Record<string, boolean>
  let i = 0
  const allBlocksStateIdToModelIdMap = {} as AllBlocksStateIdToModelIdMap

  const addBlockModel = (state: number, name: string, props: Record<string, any>, mcBlockData?: IndexedBlock, defaultState = false) => {
    const models = provider.getAllResolvedModels0_1({
      name,
      properties: props
    }, isPreflat)
    // skipping composite blocks
    if (models.length !== 1 || !models[0]![0].elements) {
      return
    }
    const elements = models[0]![0]?.elements
    if (elements.length !== 1 && name !== 'grass_block') {
      return
    }
    const elem = models[0]![0].elements[0]
    if (elem.from[0] !== 0 || elem.from[1] !== 0 || elem.from[2] !== 0 || elem.to[0] !== 16 || elem.to[1] !== 16 || elem.to[2] !== 16) {
      // not full block
      return
    }
    const facesMapping = [
      ['front', 'south'],
      ['bottom', 'down'],
      ['top', 'up'],
      ['right', 'east'],
      ['left', 'west'],
      ['back', 'north'],
    ]
    const blockData: BlocksModelData = {
      textures: [0, 0, 0, 0, 0, 0],
      rotation: [0, 0, 0, 0, 0, 0]
    }
    for (const [face, { texture, cullface, rotation = 0 }] of Object.entries(elem.faces)) {
      const faceIndex = facesMapping.findIndex(x => x.includes(face))
      if (faceIndex === -1) {
        throw new Error(`Unknown face ${face}`)
      }
      blockData.textures[faceIndex] = texture.tileIndex
      blockData.rotation[faceIndex] = rotation / 90
      if (Math.floor(blockData.rotation[faceIndex]) !== blockData.rotation[faceIndex]) {
        throw new Error(`Invalid rotation ${rotation} ${name}`)
      }
      interestedTextureTiles.add(texture.debugName)
    }
    const k = i++
    allBlocksStateIdToModelIdMap[state] = k
    blocksDataModel[k] = blockData
    if (defaultState) {
      blocksDataModelDebug[name] ??= blockData
    }
    blocksProccessed[name] = true
    if (mcBlockData) {
      blockData.transparent = mcBlockData.transparent
      blockData.emitLight = mcBlockData.emitLight
      blockData.filterLight = mcBlockData.filterLight
    }
  }
  addBlockModel(-1, 'unknown', {})
  const textureOverrideFullBlocks = {
    water: 'water_still',
    lava: 'lava_still'
  }
  outer: for (const b of loadedData.blocksArray) {
    for (let state = b.minStateId; state <= b.maxStateId; state++) {
      if (interestedTextureTiles.size >= WEBGPU_FULL_TEXTURES_LIMIT) {
        console.warn(`Limit in ${WEBGPU_FULL_TEXTURES_LIMIT} textures reached for full blocks, skipping others!`)
        break outer
      }
      const mapping = blocksMap[b.name]
      const block = PBlockOriginal.fromStateId(mapping && loadedData.blocksByName[mapping] ? loadedData.blocksByName[mapping].defaultState : state, 0)
      if (isPreflat) {
        getPreflatBlock(block)
      }

      const textureOverride = textureOverrideFullBlocks[block.name] as string | undefined
      if (textureOverride) {
        const k = i++
        const texture = provider.getTextureInfo(textureOverride)
        if (!texture) {
          console.warn('Missing texture override')
          continue
        }
        const texIndex = texture.tileIndex
        allBlocksStateIdToModelIdMap[state] = k
        const blockData: BlocksModelData = {
          textures: [texIndex, texIndex, texIndex, texIndex, texIndex, texIndex],
          rotation: [0, 0, 0, 0, 0, 0],
          filterLight: b.filterLight
        }
        blocksDataModel[k] = blockData
        interestedTextureTiles.add(textureOverride)
        continue
      }

      if (block.shapes.length === 0 || !block.shapes.every(shape => {
        return shape[0] === 0 && shape[1] === 0 && shape[2] === 0 && shape[3] === 1 && shape[4] === 1 && shape[5] === 1
      })) {
        continue
      }

      addBlockModel(state, block.name, block.getProperties(), b, state === b.defaultState)
    }
  }
  return {
    blocksDataModel,
    allBlocksStateIdToModelIdMap,
    interestedTextureTiles,
    blocksDataModelDebug
  }
}
export type AllBlocksDataModels = Record<string, BlocksModelData>
export type AllBlocksStateIdToModelIdMap = Record<number, number>

export type BlocksModelData = {
  textures: number[]
  rotation: number[]
  transparent?: boolean
  emitLight?: number
  filterLight?: number
}
