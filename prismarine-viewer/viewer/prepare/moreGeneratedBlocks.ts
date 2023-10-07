import Jimp from 'jimp'
import minecraftData from 'minecraft-data'
import prismarineRegistry from 'prismarine-registry'
import { McAssets } from './modelsBuilder'

// todo refactor
const twoBlockTextures = []
let currentImage: Jimp
let currentBlockName: string
let currentMcAssets: McAssets
let isPreFlattening = false
const postFlatenningRegistry = prismarineRegistry('1.13')

type SidesType = {
  "up": string
  "north": string
  "east": string
  "south": string
  "west": string
  "down": string
}

const getBlockStates = (name: string, postFlatenningName = name) => {
  const mcData = isPreFlattening ? postFlatenningRegistry : minecraftData(currentMcAssets.version)
  return mcData.blocksByName[isPreFlattening ? postFlatenningName : name]?.states
}

export const addBlockCustomSidesModel = (name: string, sides: SidesType) => {
  currentMcAssets.blocksStates[name] = {
    "variants": {
      "": {
        "model": name
      }
    }
  }
  currentMcAssets.blocksModels[name] = {
    "parent": "block/cube",
    "textures": sides
  }
}

type TextureMap = [
  x: number,
  y: number,
  width?: number,
  height?: number,
]

const justCrop = (x: number, y: number, width = 16, height = 16) => {
  return currentImage.clone().crop(x, y, width, height)
}

const combineTextures = (locations: TextureMap[]) => {
  const resized: Jimp[] = []
  for (const [x, y, height = 16, width = 16] of locations) {
    resized.push(justCrop(x, y, width, height))
  }

  const combinedImage = new Jimp(locations[0]![2] ?? 16, locations[0]![3] ?? 16)
  for (const image of resized) {
    combinedImage.blit(image, 0, 0)
  }
  return combinedImage
}

const generatedImageTextures: { [blockName: string]: /* base64 */string } = {}

const getBlockTexturesFromJimp = async <T extends Record<string, Jimp>> (sides: T, withUv = false): Promise<Record<keyof T, any>> => {
  const sidesTextures = {} as any
  for (const [side, jimp] of Object.entries(sides)) {
    const textureName = `${currentBlockName}_${side}`
    const sideTexture = withUv ? { uv: [0, 0, jimp.getWidth(), jimp.getHeight()], texture: textureName } : textureName
    const base64 = await jimp.getBase64Async(jimp.getMIME())
    if (side === 'side') {
      sidesTextures['north'] = sideTexture
      sidesTextures['east'] = sideTexture
      sidesTextures['south'] = sideTexture
      sidesTextures['west'] = sideTexture
    } else {
      sidesTextures[side] = sideTexture
    }
    generatedImageTextures[textureName] = base64
  }

  return sidesTextures
}

const addSimpleCubeWithSides = async (sides: Record<string, Jimp>) => {
  const sidesTextures = await getBlockTexturesFromJimp(sides)

  addBlockCustomSidesModel(currentBlockName, sidesTextures as any)
}

const handleShulkerBox = async (dataBase: string, match: RegExpExecArray) => {
  const [, shulkerColor = ''] = match
  currentImage = await Jimp.read(dataBase + `entity/shulker/shulker${shulkerColor && `_${shulkerColor}`}.png`)

  const shulkerBoxTextures = {
    // todo do all sides
    side: combineTextures([
      [0, 16], // top
      [0, 36], // bottom
    ]),
    up: justCrop(16, 0),
    down: justCrop(32, 28)
  }

  await addSimpleCubeWithSides(shulkerBoxTextures)
}

const handleSign = async (dataBase: string, match: RegExpExecArray) => {
  const states = getBlockStates(currentBlockName, currentBlockName === 'wall_sign' ? 'wall_sign' : 'sign')
  if (!states) return

  const [, signMaterial = ''] = match
  currentImage = await Jimp.read(`${dataBase}entity/${signMaterial ? `signs/${signMaterial}` : 'sign'}.png`)
  // todo cache
  const signTextures = {
    // todo correct mapping
    // todo alg to fit to the side
    signboard_side: justCrop(0, 2, 2, 12),
    face: justCrop(2, 2, 24, 12),
    up: justCrop(2, 0, 24, 2),
    support: justCrop(0, 16, 2, 14)
  }
  const blockTextures = await getBlockTexturesFromJimp(signTextures, true)

  const isWall = currentBlockName.includes('wall_')
  const isHanging = currentBlockName.includes('hanging_')
  const rotationState = states.find(state => state.name === 'rotation')
  if (isWall || isHanging) {
    // todo isHanging
    if (!isHanging) {
      const facingState = states.find(state => state.name === 'facing')
      const facingMap = {
        south: 0,
        west: 90,
        north: 180,
        east: 270
      }

      currentMcAssets.blocksStates[currentBlockName] = {
        "variants": Object.fromEntries(
          facingState.values!.map((_val, i) => {
            const val = _val as string
            return [`facing=${val}`, {
              "model": currentBlockName,
              y: facingMap[val],
            }]
          })
        )
      }
      currentMcAssets.blocksModels[currentBlockName] = {
        elements: [
          {
            // signboard
            "from": [0, 4.5, 0],
            "to": [16, 11.5, 1.5],
            faces: {
              // north: { texture: blockTextures.face, uv: [0, 0, 16, 16] },
              south: { texture: blockTextures.face.texture, uv: [0, 0, 16, 16] },
              east: { texture: blockTextures.signboard_side.texture, uv: [0, 0, 16, 16] },
              west: { texture: blockTextures.signboard_side.texture, uv: [0, 0, 16, 16] },
              up: { texture: blockTextures.up.texture, uv: [0, 0, 16, 16] },
              down: { texture: blockTextures.up.texture, uv: [0, 0, 16, 16] },
            },
          }
        ],
      }
    }
  } else if (rotationState) {
    currentMcAssets.blocksStates[currentBlockName] = {
      "variants": Object.fromEntries(
        Array.from({ length: 16 }).map((_val, i) => {
          return [`rotation=${i}`, {
            "model": currentBlockName,
            y: i * 45,
          }]
        })
      )
    }

    const supportTexture = blockTextures.support
    // TODO fix models.ts, apply textures for signs correctly!
    // const supportTexture = { texture: supportTextureImg, uv: [0, 0, 16, 16] }
    currentMcAssets.blocksModels[currentBlockName] = {
      elements: [
        {
          // support post
          "from": [7.5, 0, 7.5],
          "to": [8.5, 9, 8.5],
          faces: {
            // todo 14
            north: supportTexture,
            east: supportTexture,
            south: supportTexture,
            west: supportTexture,
          }
        },
        {
          // signboard
          "from": [0, 9, 7.25],
          "to": [16, 16, 8.75],
          faces: {
            north: { texture: blockTextures.face.texture, uv: [0, 0, 16, 16] },
            south: { texture: blockTextures.face.texture, uv: [0, 0, 16, 16] },
            east: { texture: blockTextures.signboard_side.texture, uv: [0, 0, 16, 16] },
            west: { texture: blockTextures.signboard_side.texture, uv: [0, 0, 16, 16] },
            up: { texture: blockTextures.up.texture, uv: [0, 0, 16, 16] },
            down: { texture: blockTextures.up.texture, uv: [0, 0, 16, 16] },
          },
        }
      ],
    }
  }
  twoBlockTextures.push(blockTextures.face.texture)
}

const handlers = [
  [/(.+)_shulker_box$/, handleShulkerBox],
  [/^shulker_box$/, handleShulkerBox],
  [/^sign$/, handleSign],
  [/^standing_sign$/, handleSign],
  [/^wall_sign$/, handleSign],
  [/(.+)_wall_sign$/, handleSign],
  [/(.+)_sign$/, handleSign],
  // no-op just suppress warning
  [/(^light|^moving_piston$)/, true],
] as const

export const tryHandleBlockEntity = async (dataBase, blockName) => {
  currentBlockName = blockName
  for (const [regex, handler] of handlers) {
    const match = regex.exec(blockName)
    if (!match) continue
    if (handler !== true) {
      await handler(dataBase, match)
    }
    return true
  }
}

export const prepareMoreGeneratedBlocks = async (mcAssets: McAssets) => {
  const mcData = minecraftData(mcAssets.version)
  //@ts-expect-error
  isPreFlattening = !mcData.supportFeature('blockStateId')
  const allTheBlocks = mcData.blocksArray.map(x => x.name)

  currentMcAssets = mcAssets
  const handledBlocks = ['water', 'lava', 'barrier']
  // todo
  const ignoredBlocks = ['skull', 'structure_void', 'banner', 'bed', 'end_portal']

  for (const theBlock of allTheBlocks) {
    try {
      if (await tryHandleBlockEntity(mcAssets.directory, theBlock)) {
        handledBlocks.push(theBlock)
      }
    } catch (err) {
      // todo remove when all warnings are resolved
      console.warn(`[${mcAssets.version}] failed to generate block ${theBlock}`)
    }
  }

  const warnings = []
  for (const [name, model] of Object.entries(mcAssets.blocksModels)) {
    if (Object.keys(model).length === 1 && model.textures) {
      const keys = Object.keys(model.textures)
      if (keys.length === 1 && keys[0] === 'particle') {
        if (handledBlocks.includes(name) || ignoredBlocks.includes(name)) continue
        warnings.push(`unhandled block ${name}`)
      }
    }
  }

  return { warnings }
}

export const getAdditionalTextures = () => {
  return { generated: generatedImageTextures, twoBlockTextures }
}

// test below
// const dataBase = '...'
// const blockName = 'light_blue_shulker_box'

// currentMcAssets = {
//   blocksModels: {},
//   blocksStates: {}
// } as any
// tryHandleBlockEntity(dataBase, blockName).then(() => {
//   for (const [key, value] of Object.entries(generatedImageTextures)) {
//     console.log(key, value)
//   }
//   console.log(currentMcAssets)
// })
// { name: 'chest_top', x: 0, y: 0, width: 16, height: 15 },
// { name: 'chest_side_top', x: 0, y: 15, width: 16, height: 5 },
// { name: 'chest_side_bottom', x: 0, y: 34, width: 16, height: 9 },
// { name: 'chest_front', x: 0, y: 43, width: 16, height: 14 },
