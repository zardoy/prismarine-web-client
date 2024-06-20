import { subscribe } from 'valtio'
import { showInventory } from 'minecraft-inventory-gui/web/ext.mjs'
import InventoryGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/inventory.png'
import ChestLikeGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/shulker_box.png'
import LargeChestLikeGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/generic_54.png'
import FurnaceGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/furnace.png'
import CraftingTableGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/crafting_table.png'
import DispenserGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/dispenser.png'
import HopperGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/hopper.png'
import HorseGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/horse.png'
import VillagerGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/villager2.png'
import EnchantingGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/enchanting_table.png'
import AnvilGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/anvil.png'
import BeaconGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/container/beacon.png'
import WidgetsGui from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/widgets.png'

import Dirt from 'minecraft-assets/minecraft-assets/data/1.17.1/blocks/dirt.png'
import { RecipeItem } from 'minecraft-data'
import { versionToNumber } from 'prismarine-viewer/viewer/prepare/utils'
import itemsPng from 'prismarine-viewer/public/textures/items.png'
import itemsLegacyPng from 'prismarine-viewer/public/textures/items-legacy.png'
import _itemsAtlases from 'prismarine-viewer/public/textures/items.json'
import type { ItemsAtlasesOutputJson } from 'prismarine-viewer/viewer/prepare/genItemsAtlas'
import PrismarineBlockLoader from 'prismarine-block'
import { flat } from '@xmcl/text-component'
import mojangson from 'mojangson'
import nbt from 'prismarine-nbt'
import { splitEvery, equals } from 'rambda'
import PItem, { Item } from 'prismarine-item'
import Generic95 from '../assets/generic_95.png'
import { activeModalStack, hideCurrentModal, hideModal, miscUiState, showModal } from './globalState'
import invspriteJson from './invsprite.json'
import { options } from './optionsStorage'
import { assertDefined, inGameError } from './utils'
import { MessageFormatPart } from './botUtils'
import { currentScaling } from './scaleInterface'
import { descriptionGenerators, getItemDescription } from './itemsDescriptions'

export const itemsAtlases: ItemsAtlasesOutputJson = _itemsAtlases
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

let lastWindow: ReturnType<typeof showInventory>
/** bot version */
let version: string
let PrismarineBlock: typeof PrismarineBlockLoader.Block
let PrismarineItem: typeof Item

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
  PrismarineItem = PItem(version)

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
          text: `[client error] cannot open unimplemented window ${win.id} (${win.type}). Slots: ${win.slots.map(item => getItemName(item)).filter(Boolean).join(', ')}`
        })
      })
      bot.currentWindow?.['close']()
    }
  })

  bot.inventory.on('updateSlot', ((_oldSlot, oldItem, newItem) => {
    const oldSlot = _oldSlot as number
    if (!miscUiState.singleplayer) return
    const { craftingResultSlot } = bot.inventory
    if (oldSlot === craftingResultSlot && oldItem && !newItem) {
      for (let i = 1; i < 5; i++) {
        const count = bot.inventory.slots[i]?.count
        if (count && count > 1) {
          const slot = bot.inventory.slots[i]!
          slot.count--
          void bot.creative.setInventorySlot(i, slot)
        } else {
          void bot.creative.setInventorySlot(i, null)
        }
      }
      return
    }
    const craftingSlots = bot.inventory.slots.slice(1, 5)
    const resultingItem = getResultingRecipe(craftingSlots, 2)
    void bot.creative.setInventorySlot(craftingResultSlot, resultingItem ?? null)
  }) as any)

  bot.on('windowClose', () => {
    // todo hide up to the window itself!
    if (lastWindow) {
      hideCurrentModal()
    }
  })
  bot.on('respawn', () => { // todo validate logic against native client (maybe login)
    if (lastWindow) {
      hideCurrentModal()
    }
  })

  customEvents.on('search', (q) => {
    if (!lastWindow) return
    upJei(q)
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
    case 'gui/container/generic_95': return Generic95
    case 'gui/container/hopper': return HopperGui
    case 'gui/container/horse': return HorseGui
    case 'gui/container/villager2': return VillagerGui
    case 'gui/container/enchanting_table': return EnchantingGui
    case 'gui/container/anvil': return AnvilGui
    case 'gui/container/beacon': return BeaconGui
    case 'gui/widgets': return WidgetsGui
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

type RenderSlot = Pick<import('prismarine-item').Item, 'name' | 'displayName' | 'durabilityUsed' | 'maxDurability' | 'enchants'>
const renderSlot = (slot: RenderSlot, skipBlock = false): { texture: string, blockData?, scale?: number, slice?: number[] } | undefined => {
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
  console.warn(`No render data for ${itemName}`)
  if (isItem) {
    return {
      texture: 'blocks',
      slice: [0, 0, 16, 16]
    }
  }
}

type JsonString = string
type PossibleItemProps = {
  Damage?: number
  display?: { Name?: JsonString } // {"text":"Knife","color":"white","italic":"true"}
}
export const getItemNameRaw = (item: Pick<import('prismarine-item').Item, 'nbt'> | null) => {
  if (!item?.nbt) return
  const itemNbt: PossibleItemProps = nbt.simplify(item.nbt)
  const customName = itemNbt.display?.Name
  if (!customName) return
  try {
    const parsed = mojangson.simplify(mojangson.parse(customName))
    if (parsed.extra) {
      return parsed as Record<string, any>
    } else {
      return parsed as MessageFormatPart
    }
  } catch (err) {
    return [{
      text: customName
    }]
  }
}

const getItemName = (slot: Item | null) => {
  const parsed = getItemNameRaw(slot)
  if (!parsed) return
  // todo display full text renderer from sign renderer
  const text = flat(parsed as MessageFormatPart).map(x => x.text)
  return text.join('')
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

const mapSlots = (slots: Array<RenderSlot | Item | null>) => {
  return slots.map(slot => {
    // todo stateid
    if (!slot) return

    try {
      const slotCustomProps = renderSlot(slot)
      Object.assign(slot, { ...slotCustomProps, displayName: ('nbt' in slot ? getItemName(slot) : undefined) ?? slot.displayName })
      //@ts-expect-error
      slot.toJSON = () => {
        // Allow to serialize slot to JSON as minecraft-inventory-gui creates icon property as cache (recursively)
        //@ts-expect-error
        const { icon, ...rest } = slot
        return rest
      }
    } catch (err) {
      inGameError(err)
    }
    return slot
  })
}

export const upInventoryItems = (isInventory: boolean, invWindow = lastWindow) => {
  // inv.pwindow.inv.slots[2].displayName = 'test'
  // inv.pwindow.inv.slots[2].blockData = getBlockData('dirt')
  const customSlots = mapSlots((isInventory ? bot.inventory : bot.currentWindow)!.slots)
  invWindow.pwindow.setSlots(customSlots)
}

export const onModalClose = (callback: () => any) => {
  const modal = activeModalStack.at(-1)
  const unsubscribe = subscribe(activeModalStack, () => {
    const newModal = activeModalStack.at(-1)
    if (modal?.reactType !== newModal?.reactType) {
      callback()
      unsubscribe()
    }
  }, true)
}

const implementedContainersGuiMap = {
  // todo allow arbitrary size instead!
  'minecraft:generic_9x1': 'ChestWin',
  'minecraft:generic_9x2': 'ChestWin',
  'minecraft:generic_9x3': 'ChestWin',
  'minecraft:generic_9x4': 'Generic95Win',
  'minecraft:generic_9x5': 'Generic95Win',
  // hopper
  'minecraft:generic_5x1': 'HopperWin',
  'minecraft:generic_9x6': 'LargeChestWin',
  'minecraft:generic_3x3': 'DropDispenseWin',
  'minecraft:furnace': 'FurnaceWin',
  'minecraft:smoker': 'FurnaceWin',
  'minecraft:crafting': 'CraftingWin',
  'minecraft:anvil': 'AnvilWin',
  // enchant
  'minecraft:enchanting_table': 'EnchantingWin',
  // horse
  'minecraft:horse': 'HorseWin',
  // villager
  'minecraft:villager': 'VillagerWin',
}

const upJei = (search: string) => {
  search = search.toLowerCase()
  // todo fix pre flat
  const matchedSlots = loadedData.itemsArray.map(x => {
    if (!x.displayName.toLowerCase().includes(search)) return null
    return new PrismarineItem(x.id, 1)
  }).filter(a => a !== null)
  lastWindow.pwindow.win.jeiSlotsPage = 0
  lastWindow.pwindow.win.jeiSlots = mapSlots(matchedSlots)
}

export const openItemsCanvas = (type, _bot = bot as typeof bot | null) => {
  const inv = showInventory(type, getImage, {}, _bot)
  inv.canvasManager.children[0].callbacks.getItemRecipes = (item) => {
    const allRecipes = getAllItemRecipes(item.name)
    inv.canvasManager.children[0].messageDisplay = ''
    const itemDescription = getItemDescription(item)
    if (!allRecipes?.length && !itemDescription) {
      inv.canvasManager.children[0].messageDisplay = `No recipes found for ${item.displayName}`
    }
    return [...allRecipes ?? [], ...itemDescription ? [
      [
        'GenericDescription',
        mapSlots([item])[0],
        [],
        itemDescription
      ]
    ] : []]
  }
  inv.canvasManager.children[0].callbacks.getItemUsages = (item) => {
    const allItemUsages = getAllItemUsages(item.name)
    inv.canvasManager.children[0].messageDisplay = ''
    if (!allItemUsages?.length) {
      inv.canvasManager.children[0].messageDisplay = `No usages found for ${item.displayName}`
    }
    return allItemUsages
  }
  return inv
}

let skipClosePacketSending = false
const openWindow = (type: string | undefined) => {
  // if (activeModalStack.some(x => x.reactType?.includes?.('player_win:'))) {
  if (activeModalStack.length) { // game is not in foreground, don't close current modal
    if (type) {
      skipClosePacketSending = true
      hideCurrentModal()
    } else {
      bot.currentWindow?.['close']()
      return
    }
  }
  showModal({
    reactType: `player_win:${type}`,
  })
  onModalClose(() => {
    // might be already closed (event fired)
    if (type !== undefined && bot.currentWindow && !skipClosePacketSending) bot.currentWindow['close']()
    lastWindow.destroy()
    lastWindow = null as any
    window.lastWindow = lastWindow
    miscUiState.displaySearchInput = false
    destroyFn()
    skipClosePacketSending = false
  })
  cleanLoadedImagesCache()
  const inv = openItemsCanvas(type)
  // todo
  inv.canvasManager.setScale(currentScaling.scale === 1 ? 1.5 : currentScaling.scale)
  inv.canvas.style.zIndex = '10'
  inv.canvas.style.position = 'fixed'
  inv.canvas.style.inset = '0'

  inv.canvasManager.onClose = async () => {
    await new Promise(resolve => {
      setTimeout(resolve, 0)
    })
    if (activeModalStack.at(-1)?.reactType?.includes('player_win:')) {
      hideModal(undefined, undefined, { force: true })
    }
    inv.canvasManager.destroy()
  }

  lastWindow = inv
  const upWindowItems = () => {
    void Promise.resolve().then(() => upInventoryItems(type === undefined))
  }
  upWindowItems()

  lastWindow.pwindow.touch = miscUiState.currentTouch
  const oldOnInventoryEvent = lastWindow.pwindow.onInventoryEvent.bind(lastWindow.pwindow)
  lastWindow.pwindow.onInventoryEvent = (type, containing, windowIndex, inventoryIndex, item) => {
    if (inv.canvasManager.children[0].currentGuide) {
      const isRightClick = type === 'rightclick'
      const isLeftClick = type === 'leftclick'
      if (isLeftClick || isRightClick) {
        inv.canvasManager.children[0].showRecipesOrUsages(isLeftClick, item)
      }
    } else {
      oldOnInventoryEvent(type, containing, windowIndex, inventoryIndex, item)
    }
  }
  lastWindow.pwindow.onJeiClick = (slotItem, _index, isRightclick) => {
    // slotItem is the slot from mapSlots
    const itemId = loadedData.itemsByName[slotItem.name]?.id
    if (!itemId) {
      inGameError(`Item for block ${slotItem.name} not found`)
      return
    }
    const item = new PrismarineItem(itemId, isRightclick ? 64 : 1, slotItem.metadata)
    if (bot.game.gameMode === 'creative') {
      const freeSlot = bot.inventory.firstEmptyInventorySlot()
      if (freeSlot === null) return
      void bot.creative.setInventorySlot(freeSlot, item)
    } else {
      inv.canvasManager.children[0].showRecipesOrUsages(!isRightclick, mapSlots([item])[0])
    }
  }

  // if (bot.game.gameMode !== 'spectator') {
  lastWindow.pwindow.win.jeiSlotsPage = 0
  // todo workaround so inventory opens immediately (though it still lags)
  setTimeout(() => {
    upJei('')
  })
  miscUiState.displaySearchInput = true
  // } else {
  //   lastWindow.pwindow.win.jeiSlots = []
  // }

  if (type === undefined) {
    // player inventory
    bot.inventory.on('updateSlot', upWindowItems)
    destroyFn = () => {
      bot.inventory.off('updateSlot', upWindowItems)
    }
  } else {
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

const getResultingRecipe = (slots: Array<Item | null>, gridRows: number) => {
  const inputSlotsItems = slots.map(blockSlot => blockSlot?.type)
  let currentShape = splitEvery(gridRows, inputSlotsItems as Array<number | undefined | null>)
  // todo rewrite with candidates search
  if (currentShape.length > 1) {
    // eslint-disable-next-line @typescript-eslint/no-for-in-array
    for (const slotX in currentShape[0]) {
      if (currentShape[0][slotX] !== undefined) {
        for (const [otherY] of Array.from({ length: gridRows }).entries()) {
          if (currentShape[otherY]?.[slotX] === undefined) {
            currentShape[otherY]![slotX] = null
          }
        }
      }
    }
  }
  currentShape = currentShape.map(arr => arr.filter(x => x !== undefined)).filter(x => x.length !== 0)

  // todo rewrite
  // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
  const slotsIngredients = [...inputSlotsItems].sort().filter(item => item !== undefined)
  type Result = RecipeItem | undefined
  let shapelessResult: Result
  let shapeResult: Result
  outer: for (const [id, recipeVariants] of Object.entries(loadedData.recipes)) {
    for (const recipeVariant of recipeVariants) {
      if ('inShape' in recipeVariant && equals(currentShape, recipeVariant.inShape as number[][])) {
        shapeResult = recipeVariant.result!
        break outer
      }
      if ('ingredients' in recipeVariant && equals(slotsIngredients, recipeVariant.ingredients?.sort() as number[])) {
        shapelessResult = recipeVariant.result
        break outer
      }
    }
  }
  const result = shapeResult ?? shapelessResult
  if (!result) return
  const id = typeof result === 'number' ? result : Array.isArray(result) ? result[0] : result.id
  if (!id) return
  const count = (typeof result === 'number' ? undefined : Array.isArray(result) ? result[1] : result.count) ?? 1
  const metadata = typeof result === 'object' && !Array.isArray(result) ? result.metadata : undefined
  const item = new PrismarineItem(id, count, metadata)
  return item
}

const ingredientToItem = (recipeItem) => recipeItem === null ? null : new PrismarineItem(recipeItem, 1)

const getAllItemRecipes = (itemName: string) => {
  const item = loadedData.itemsByName[itemName]
  if (!item) return
  const itemId = item.id
  const recipes = loadedData.recipes[itemId]
  if (!recipes) return
  const results = [] as Array<{
    result: Item,
    ingredients: Array<Item | null>,
    description?: string
  }>

  // get recipes here
  for (const recipe of recipes) {
    const { result } = recipe
    if (!result) continue
    const resultId = typeof result === 'number' ? result : Array.isArray(result) ? result[0]! : result.id
    const resultCount = (typeof result === 'number' ? undefined : Array.isArray(result) ? result[1] : result.count) ?? 1
    const resultMetadata = typeof result === 'object' && !Array.isArray(result) ? result.metadata : undefined
    const resultItem = new PrismarineItem(resultId!, resultCount, resultMetadata)
    if ('inShape' in recipe) {
      const ingredients = recipe.inShape
      if (!ingredients) continue

      const ingredientsItems = ingredients.flatMap(items => items.map(item => ingredientToItem(item)))
      results.push({ result: resultItem, ingredients: ingredientsItems })
    }
    if ('ingredients' in recipe) {
      const { ingredients } = recipe
      if (!ingredients) continue
      const ingredientsItems = ingredients.map(item => ingredientToItem(item))
      results.push({ result: resultItem, ingredients: ingredientsItems, description: 'Shapeless' })
    }
  }
  return results.map(({ result, ingredients, description }) => {
    return [
      'CraftingTableGuide',
      mapSlots([result])[0],
      mapSlots(ingredients),
      description
    ]
  })
}

const getAllItemUsages = (itemName: string) => {
  const item = loadedData.itemsByName[itemName]
  if (!item) return
  const foundRecipeIds = [] as string[]

  for (const [id, recipes] of Object.entries(loadedData.recipes)) {
    for (const recipe of recipes) {
      if ('inShape' in recipe) {
        if (recipe.inShape.some(row => row.includes(item.id))) {
          foundRecipeIds.push(id)
        }
      }
      if ('ingredients' in recipe) {
        if (recipe.ingredients.includes(item.id)) {
          foundRecipeIds.push(id)
        }
      }
    }
  }

  return foundRecipeIds.flatMap(id => {
    // todo should use exact match, not include all recipes!
    return getAllItemRecipes(loadedData.items[id].name)
  })
}
