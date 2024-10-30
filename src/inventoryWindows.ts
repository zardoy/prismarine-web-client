import { proxy, subscribe } from 'valtio'
import { showInventory } from 'minecraft-inventory-gui/web/ext.mjs'

// import Dirt from 'mc-assets/dist/other-textures/latest/blocks/dirt.png'
import { RecipeItem } from 'minecraft-data'
import { flat, fromFormattedString } from '@xmcl/text-component'
import mojangson from 'mojangson'
import nbt from 'prismarine-nbt'
import { splitEvery, equals } from 'rambda'
import PItem, { Item } from 'prismarine-item'
import { ItemsRenderer } from 'mc-assets/dist/itemsRenderer'
import { versionToNumber } from 'prismarine-viewer/viewer/prepare/utils'
import { getRenamedData } from 'flying-squid/dist/blockRenames'
import PrismarineChatLoader from 'prismarine-chat'
import Generic95 from '../assets/generic_95.png'
import { appReplacableResources } from './generated/resources'
import { activeModalStack, hideCurrentModal, hideModal, miscUiState, showModal } from './globalState'
import { options } from './optionsStorage'
import { assertDefined, inGameError } from './utils'
import { displayClientChat } from './botUtils'
import { currentScaling } from './scaleInterface'
import { getItemDescription } from './itemsDescriptions'
import { MessageFormatPart } from './chatUtils'

const loadedImagesCache = new Map<string, HTMLImageElement>()
const cleanLoadedImagesCache = () => {
  loadedImagesCache.delete('blocks')
}

let lastWindow: ReturnType<typeof showInventory>
/** bot version */
let version: string
let PrismarineItem: typeof Item

export const allImagesLoadedState = proxy({
  value: false
})

let itemsRenderer: ItemsRenderer
export const onGameLoad = (onLoad) => {
  allImagesLoadedState.value = false
  version = bot.version

  const checkIfLoaded = () => {
    if (!viewer.world.itemsAtlasParser) return
    itemsRenderer = new ItemsRenderer(bot.version, viewer.world.blockstatesModels, viewer.world.itemsAtlasParser, viewer.world.blocksAtlasParser)
    globalThis.itemsRenderer = itemsRenderer
    if (allImagesLoadedState.value) return
    onLoad?.()
    allImagesLoadedState.value = true
  }
  viewer.world.renderUpdateEmitter.on('textureDownloaded', checkIfLoaded)
  checkIfLoaded()

  PrismarineItem = PItem(version)

  bot.on('windowOpen', (win) => {
    if (implementedContainersGuiMap[win.type]) {
      openWindow(implementedContainersGuiMap[win.type])
    } else if (options.unimplementedContainers) {
      openWindow('ChestWin')
    } else {
      // todo format
      displayClientChat(`[client error] cannot open unimplemented window ${win.id} (${win.type}). Slots: ${win.slots.map(item => getItemName(item)).filter(Boolean).join(', ')}`)
      bot.currentWindow?.['close']()
    }
  })

  // workaround: singleplayer player inventory crafting
  let skipUpdate = false
  bot.inventory.on('updateSlot', ((_oldSlot, oldItem, newItem) => {
    const currentSlot = _oldSlot as number
    if (!miscUiState.singleplayer || oldItem === newItem || skipUpdate) return
    const { craftingResultSlot } = bot.inventory
    if (currentSlot === craftingResultSlot && oldItem && !newItem) {
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
    if (currentSlot > 4) return
    const craftingSlots = bot.inventory.slots.slice(1, 5)
    try {
      const resultingItem = getResultingRecipe(craftingSlots, 2)
      skipUpdate = true
      void bot.creative.setInventorySlot(craftingResultSlot, resultingItem ?? null).then(() => {
        skipUpdate = false
      })
    } catch (err) {
      console.error(err)
      // todo resolve the error! and why would we ever get here on every update?
    }
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

const getImageSrc = (path): string | HTMLImageElement => {
  assertDefined(viewer)
  switch (path) {
    case 'gui/container/inventory': return appReplacableResources.latest_gui_container_inventory.content
    case 'blocks': return viewer.world.blocksAtlasParser!.latestImage
    case 'items': return viewer.world.itemsAtlasParser!.latestImage
    case 'gui/container/dispenser': return appReplacableResources.latest_gui_container_dispenser.content
    case 'gui/container/furnace': return appReplacableResources.latest_gui_container_furnace.content
    case 'gui/container/crafting_table': return appReplacableResources.latest_gui_container_crafting_table.content
    case 'gui/container/shulker_box': return appReplacableResources.latest_gui_container_shulker_box.content
    case 'gui/container/generic_54': return appReplacableResources.latest_gui_container_generic_54.content
    case 'gui/container/generic_95': return Generic95
    case 'gui/container/hopper': return appReplacableResources.latest_gui_container_hopper.content
    case 'gui/container/horse': return appReplacableResources.latest_gui_container_horse.content
    case 'gui/container/villager2': return appReplacableResources.latest_gui_container_villager2.content
    case 'gui/container/enchanting_table': return appReplacableResources.latest_gui_container_enchanting_table.content
    case 'gui/container/anvil': return appReplacableResources.latest_gui_container_anvil.content
    case 'gui/container/beacon': return appReplacableResources.latest_gui_container_beacon.content
    case 'gui/widgets': return appReplacableResources.other_textures_latest_gui_widgets.content
  }
  // empty texture
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
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

type RenderSlot = Pick<import('prismarine-item').Item, 'name' | 'displayName' | 'durabilityUsed' | 'maxDurability' | 'enchants'>
const renderSlot = (slot: RenderSlot, skipBlock = false): {
  texture: string,
  blockData?: Record<string, { slice, path }>,
  scale?: number,
  slice?: number[]
} | undefined => {
  let itemName = slot.name
  const isItem = loadedData.itemsByName[itemName]

  let itemTexture
  try {
    if (versionToNumber(bot.version) < versionToNumber('1.13')) itemName = getRenamedData(isItem ? 'items' : 'blocks', itemName, bot.version, '1.13.1') as string
    itemTexture = itemsRenderer.getItemTexture(itemName) ?? itemsRenderer.getItemTexture('item/missing_texture')!
  } catch (err) {
    itemTexture = itemsRenderer.getItemTexture('block/errored')!
    inGameError(`Failed to render item ${itemName} on ${bot.version} (resourcepack: ${options.enabledResourcepack}): ${err.message}`)
  }
  if ('type' in itemTexture) {
    // is item
    return {
      texture: itemTexture.type,
      slice: itemTexture.slice
    }
  } else {
    // is block
    return {
      texture: 'blocks',
      blockData: itemTexture
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
    return {
      text: customName
    }
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
  'minecraft:crafting3x3': 'CraftingWin', // todo different result slot
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
  const inv = showInventory(type, getImage, {}, _bot);
  (inv.canvasManager.children[0].callbacks as any).getItemRecipes = (item) => {
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
  (inv.canvasManager.children[0].callbacks as any).getItemUsages = (item) => {
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
  inv.canvasManager.children[0].mobileHelpers = miscUiState.currentTouch
  const title = bot.currentWindow?.title
  const PrismarineChat = PrismarineChatLoader(bot.version)
  try {
    inv.canvasManager.children[0].customTitleText = title ?
      typeof title === 'string' ?
        fromFormattedString(title).text :
        new PrismarineChat(title).toString() :
      undefined
  } catch (err) {
    reportError?.(err)
    inv.canvasManager.children[0].customTitleText = undefined
  }
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
    if (!lastWindow && bot.currentWindow) {
      // edge case: might happen due to high ping, inventory should be closed soon!
      // openWindow(implementedContainersGuiMap[bot.currentWindow.type])
      return
    }
    void Promise.resolve().then(() => upInventoryItems(type === undefined))
  }
  upWindowItems()

  lastWindow.pwindow.touch = miscUiState.currentTouch ?? false
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

const ingredientToItem = (recipeItem) => (recipeItem === null ? null : new PrismarineItem(recipeItem, 1))

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
