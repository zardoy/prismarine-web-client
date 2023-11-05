import { subscribe } from 'valtio'
import { showInventory } from 'minecraft-inventory-gui/web/ext.mjs'
import InventoryGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/inventory.png'
import ChestLikeGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/shulker_box.png'
import LargeChestLikeGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/generic_54.png'
import FurnaceGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/furnace.png'
import CraftingTableGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/crafting_table.png'
import DispenserGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/dispenser.png'

import Dirt from 'minecraft-assets/minecraft-assets/data/1.17.1/blocks/dirt.png'
import { subscribeKey } from 'valtio/utils'
import MinecraftData from 'minecraft-data'
import { getVersion } from 'prismarine-viewer/viewer/lib/version'
import { versionToNumber } from 'prismarine-viewer/viewer/prepare/utils'
import itemsPng from 'prismarine-viewer/public/textures/items.png'
import itemsLegacyPng from 'prismarine-viewer/public/textures/items-legacy.png'
import _itemsAtlases from 'prismarine-viewer/public/textures/items.json'
import type { ItemsAtlasesOutputJson } from 'prismarine-viewer/viewer/prepare/genItemsAtlas'
import PrismarineBlockLoader from 'prismarine-block'
import { flat } from '@xmcl/text-component'
import mojangson from 'mojangson'
import nbt from 'prismarine-nbt'
import { activeModalStack, hideCurrentModal, miscUiState, showModal } from './globalState'
import invspriteJson from './invsprite.json'
import { options } from './optionsStorage'
import { assertDefined } from './utils'

const itemsAtlases: ItemsAtlasesOutputJson = _itemsAtlases
const loadedImagesCache = new Map<string, HTMLImageElement>()
const cleanLoadedImagesCache = () => {
  loadedImagesCache.delete('blocks')
}
export type BlockStates = Record<string, null | {
  variants: Record<string, {
    model: {
      elements: [{
        faces: {
          [face: string]: {
            texture: {
              u
              v
              su
              sv
            }
          }
        }
      }]
    }
  }>
}>

let lastWindow
/** bot version */
let version: string
let PrismarineBlock: typeof PrismarineBlockLoader.Block

export const onGameLoad = (onLoad) => {
  let loaded = 0
  const onImageLoaded = () => {
    loaded++
    if (loaded === 3) onLoad?.()
  }
  version = bot.version
  getImage({ path: 'invsprite' }, onImageLoaded)
  getImage({ path: 'items' }, onImageLoaded)
  getImage({ path: 'items-legacy' }, onImageLoaded)
  PrismarineBlock = PrismarineBlockLoader(version)

  bot.on('windowOpen', (win) => {
    if (implementedContainersGuiMap[win.type]) {
      // todo also render title!
      openWindow(implementedContainersGuiMap[win.type])
    } else if (options.unimplementedContainers) {
      openWindow('ChestWin')
    } else {
      // todo format
      bot._client.emit('chat', {
        message: JSON.stringify({
          text: `[client error] cannot open unimplemented window ${win.id} (${win.type}). Items: ${win.slots.map(slot => slot?.name).join(', ')}`
        })
      })
      bot.currentWindow?.['close']()
    }
  })
}

const findTextureInBlockStates = (name) => {
  assertDefined(viewer)
  const blockStates: BlockStates = viewer.world.customBlockStatesData || viewer.world.downloadedBlockStatesData
  const vars = blockStates[name]?.variants
  if (!vars) return
  let firstVar = Object.values(vars)[0]
  if (Array.isArray(firstVar)) firstVar = firstVar[0]
  if (!firstVar) return
  const elements = firstVar.model?.elements
  if (elements?.length !== 1) return
  return elements[0].faces
}

const svSuToCoordinates = (path: string, u, v, su, sv = su) => {
  const img = getImage({ path })!
  if (!img.width) throw new Error(`Image ${path} is not loaded`)
  return [u * img.width, v * img.height, su * img.width, sv * img.height]
}

const getBlockData = (name) => {
  const data = findTextureInBlockStates(name)
  if (!data) return

  const getSpriteBlockSide = (side) => {
    const d = data[side]?.texture
    if (!d) return
    const spriteSide = svSuToCoordinates('blocks', d.u, d.v, d.su, d.sv)
    const blockSideData = {
      slice: spriteSide,
      path: 'blocks'
    }
    return blockSideData
  }

  return {
    // todo look at grass bug
    top: getSpriteBlockSide('up') || getSpriteBlockSide('top'),
    left: getSpriteBlockSide('east') || getSpriteBlockSide('side'),
    right: getSpriteBlockSide('north') || getSpriteBlockSide('side'),
  }
}

const getInvspriteSlice = (name) => {
  const invspriteImg = loadedImagesCache.get('invsprite')
  if (!invspriteImg?.width) return

  const { x, y } = invspriteJson[name] ?? /* unknown item */ { x: 0, y: 0 }
  const sprite = [x, y, 32, 32]
  return sprite
}

const getImageSrc = (path): string | HTMLImageElement => {
  assertDefined(viewer)
  switch (path) {
    case 'gui/container/inventory': return InventoryGui
    case 'blocks': return viewer.world.customTexturesDataUrl || viewer.world.downloadedTextureImage
    case 'invsprite': return `invsprite.png`
    case 'items': return itemsPng
    case 'items-legacy': return itemsLegacyPng
    case 'gui/container/dispenser': return DispenserGui
    case 'gui/container/furnace': return FurnaceGui
    case 'gui/container/crafting_table': return CraftingTableGui
    case 'gui/container/shulker_box': return ChestLikeGui
    case 'gui/container/generic_54': return LargeChestLikeGui
  }
  return Dirt
}

const getImage = ({ path = undefined as string | undefined, texture = undefined as string | undefined, blockData = undefined as any }, onLoad = () => { }) => {
  if (!path && !texture) throw new Error('Either pass path or texture')
  const loadPath = (blockData ? 'blocks' : path ?? texture)!
  if (loadedImagesCache.has(loadPath)) {
    onLoad()
  } else {
    const imageSrc = getImageSrc(loadPath)
    let image: HTMLImageElement
    if (imageSrc instanceof Image) {
      image = imageSrc
    } else {
      image = new Image()
      image.src = imageSrc
    }
    image.onload = onLoad
    loadedImagesCache.set(loadPath, image)
  }
  return loadedImagesCache.get(loadPath)
}

const getItemVerToRender = (version: string, item: string, itemsMapSortedEntries: any[]) => {
  const verNumber = versionToNumber(version)
  for (const [itemsVer, items] of itemsMapSortedEntries) {
    // 1.18 < 1.18.1
    // 1.13 < 1.13.2
    if (items.includes(item) && verNumber <= versionToNumber(itemsVer)) {
      return itemsVer as string
    }
  }
}

const isFullBlock = (block: string) => {
  const blockData = loadedData.blocksByName[block]
  if (!blockData) return false
  const pBlock = new PrismarineBlock(blockData.id, 0, 0)
  if (pBlock.shapes?.length !== 1) return false
  const shape = pBlock.shapes[0]!
  return shape[0] === 0 && shape[1] === 0 && shape[2] === 0 && shape[3] === 1 && shape[4] === 1 && shape[5] === 1
}

const renderSlot = (slot: import('prismarine-item').Item, skipBlock = false): { texture: string, blockData?, scale?: number, slice?: number[] } | undefined => {
  const itemName = slot.name
  const isItem = loadedData.itemsByName[itemName]
  const fullBlock = isFullBlock(itemName)

  if (isItem) {
    const legacyItemVersion = getItemVerToRender(version, itemName, itemsAtlases.legacyMap)
    const vuToSlice = ({ u, v }, size) => [...svSuToCoordinates('items', u, v, size).slice(0, 2), 16, 16] // item size is fixed
    if (legacyItemVersion) {
      const textureData = itemsAtlases.legacy.textures[`${legacyItemVersion}-${itemName}`]!
      return {
        texture: 'items-legacy',
        slice: vuToSlice(textureData, itemsAtlases.legacy.size)
      }
    }
    const textureData = itemsAtlases.latest.textures[itemName]
    if (textureData) {
      return {
        texture: 'items',
        slice: vuToSlice(textureData, itemsAtlases.latest.size)
      }
    }
  }
  if (fullBlock && !skipBlock) {
    const blockData = getBlockData(itemName)
    if (blockData) {
      return {
        texture: 'blocks',
        blockData
      }
    }
  }
  const invspriteSlice = getInvspriteSlice(itemName)
  if (invspriteSlice) {
    return {
      texture: 'invsprite',
      scale: 0.5,
      slice: invspriteSlice
    }
  }
}

type JsonString = string
type PossibleItemProps = {
  Damage?: number
  display?: { Name?: JsonString } // {"text":"Knife","color":"white","italic":"true"}
}
export const getItemName = (item: import('prismarine-item').Item) => {
  if (!item.nbt) return
  const itemNbt: PossibleItemProps = nbt.simplify(item.nbt)
  const customName = itemNbt.display?.Name
  if (!customName) return
  const parsed = mojangson.simplify(mojangson.parse(customName))
  // todo display damage and full text renderer from sign renderer
  const text = flat(parsed).map(x => x.text)
  return text
}

export const renderSlotExternal = (slot) => {
  const data = renderSlot(slot, true)
  if (!data) return
  return {
    imageDataUrl: data.texture === 'invsprite' ? undefined : getImage({ path: data.texture })?.src,
    sprite: data.slice && data.texture !== 'invsprite' ? data.slice.map(x => x * 2) : data.slice,
    displayName: getItemName(slot) ?? slot.displayName,
  }
}

const upInventory = (inventory: boolean) => {
  // inv.pwindow.inv.slots[2].displayName = 'test'
  // inv.pwindow.inv.slots[2].blockData = getBlockData('dirt')
  const updateSlots = (inventory ? bot.inventory : bot.currentWindow)!.slots.map(slot => {
    // todo stateid
    if (!slot) return

    try {
      const slotCustomProps = renderSlot(slot)
      Object.assign(slot, { ...slotCustomProps, displayName: getItemName(slot) ?? slot.displayName })
    } catch (err) {
      console.error(err)
    }
    return slot
  })
  const customSlots = updateSlots
  lastWindow.pwindow.setSlots(customSlots)
}

export const onModalClose = (callback: () => any) => {
  const { length } = activeModalStack
  const unsubscribe = subscribe(activeModalStack, () => {
    if (activeModalStack.length < length) {
      callback()
      unsubscribe()
    }
  })
}

const implementedContainersGuiMap = {
  // todo allow arbitrary size instead!
  'minecraft:generic_9x3': 'ChestWin',
  'minecraft:generic_9x6': 'LargeChestWin',
  'minecraft:generic_3x3': 'DropDispenseWin',
  'minecraft:furnace': 'FurnaceWin',
  'minecraft:smoker': 'FurnaceWin',
  'minecraft:crafting': 'CraftingWin'
}

const openWindow = (type: string | undefined) => {
  // if (activeModalStack.some(x => x.reactType?.includes?.('player_win:'))) {
  if (activeModalStack.length) { // game is not in foreground, don't close current modal
    if (type) bot.currentWindow?.['close']()
    return
  }
  showModal({
    reactType: `player_win:${type}`,
  })
  onModalClose(() => {
    // might be already closed (event fired)
    if (type !== undefined && bot.currentWindow) bot.currentWindow['close']()
    lastWindow.destroy()
    lastWindow = null
    destroyFn()
  })
  cleanLoadedImagesCache()
  const inv = showInventory(type, getImage, {}, bot)
  inv.canvas.style.zIndex = '10'
  inv.canvas.style.position = 'fixed'
  inv.canvas.style.inset = '0'
  // todo scaling
  inv.canvasManager.setScale(window.innerHeight < 480 ? 2 : window.innerHeight < 700 ? 3 : 4)

  inv.canvasManager.onClose = () => {
    hideCurrentModal()
    inv.canvasManager.destroy()
  }

  lastWindow = inv
  const upWindowItems = () => {
    upInventory(type === undefined)
  }
  upWindowItems()

  if (type === undefined) {
    // player inventory
    bot.inventory.on('updateSlot', upWindowItems)
    destroyFn = () => {
      bot.inventory.off('updateSlot', upWindowItems)
    }
  } else {
    bot.on('windowClose', () => {
      // todo hide up to the window itself!
      hideCurrentModal()
    })
    //@ts-expect-error
    bot.currentWindow.on('updateSlot', () => {
      upWindowItems()
    })
  }
}

let destroyFn = () => { }

export const openPlayerInventory = () => {
  openWindow(undefined)
}
