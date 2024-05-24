//@ts-check
import minecraftData from 'minecraft-data'
import minecraftAssets from 'minecraft-assets'
import fs from 'fs'

const latestVersion = minecraftData.versions.pc[0]

const latestData = minecraftData(latestVersion.minecraftVersion)

// dont touch, these are the ones that are already full box
const fullBoxInteractionShapes = [
  'dead_bush',
  'cave_vines_plant',
  'grass',
  'tall_seagrass',
  'spruce_sapling',
  'oak_sapling',
  'dark_oak_sapling',
  'birch_sapling',
  'seagrass',
  'nether_portal',
  'tall_grass',
  'lilac',
  'cobweb'
]

const ignoreStates = [
  'mangrove_propagule',
  'moving_piston'
]

// const

// to fix
const fullBoxInteractionShapesTemp = [
  'moving_piston',
  'lime_wall_banner',
  'gray_wall_banner',
  'weeping_vines_plant',
  'pumpkin_stem',
  'red_wall_banner',
  'crimson_wall_sign',
  'magenta_wall_banner',
  'melon_stem',
  'gray_banner',
  'spruce_sign',
  'pink_wall_banner',
  'purple_banner',
  'bamboo_sapling',
  'mangrove_sign',
  'cyan_banner',
  'blue_banner',
  'green_wall_banner',
  'yellow_banner',
  'black_wall_banner',
  'green_banner',
  'oak_sign',
  'jungle_sign',
  'yellow_wall_banner',
  'lime_banner',
  'tube_coral',
  'red_banner',
  'magenta_banner',
  'brown_wall_banner',
  'white_wall_banner',
]

const shapes = latestData.blockCollisionShapes
const fullShape = shapes.shapes[1]
const outputJson = {}

let interestedBlocksNoStates = []
let interestedBlocksStates = []

const stateIgnoreStates = ['waterlogged']

const isNonInteractive = block => block.name.includes('air') || block.name.includes('water') || block.name.includes('lava') || block.name.includes('void')
const interestedBlocks = latestData.blocksArray.filter(block => {
  const shapeId = shapes.blocks[block.name]
  // console.log('shapeId', shapeId, block.name)
  if (!shapeId) return true
  const shape = typeof shapeId === 'number' ? shapes.shapes[shapeId] : shapeId
  if (shape.length === 0) return true
  // console.log(shape)
}).filter(b => !isNonInteractive(b)).filter(b => {
  if (fullBoxInteractionShapes.includes(b.name)) {
    outputJson[b.name] = fullShape
    return false
  }

  if (!b.states?.length || ignoreStates.includes(b.name) || b.states.every(s => stateIgnoreStates.every(state => s.name === state))) {
    interestedBlocksNoStates.push(b.name)
    return false
  } else {
    interestedBlocksStates.push(b.name)
    return false
  }
}).map(d => d.name)

const { blocksStates, blocksModels } = minecraftAssets(latestData.version.minecraftVersion)

const getShapeFromModel = (block,) => {
  const blockStates = JSON.parse(fs.readFileSync('./prismarine-viewer/public/blocksStates/1.19.1.json', 'utf8'))
  const blockState = blockStates[block]
  const perVariant = {}
  for (const [key, variant] of Object.entries(blockState.variants)) {
    // const shapes = (Array.isArray(variant) ? variant : [variant]).flatMap((v) => v.model?.elements).filter(Boolean).map(({ from, to }) => [...from, ...to]).reduce((acc, cur) => {
    //     return [
    //       Math.min(acc[0], cur[0]),
    //       Math.min(acc[1], cur[1]),
    //       Math.min(acc[2], cur[2]),
    //       Math.max(acc[3], cur[3]),
    //       Math.max(acc[4], cur[4]),
    //       Math.max(acc[5], cur[5])
    //     ]
    // })
    console.log(variant)
    const shapes = (Array.isArray(variant) ? variant : [variant]).flatMap((v) => v.model?.elements).filter(Boolean).map(({ from, to }) => [...from, ...to])
    perVariant[key] = shapes
    break
  }
  return perVariant
}

// console.log(getShapeFromModel('oak_button'))

// const addShapeIf = {
//   redstone: [
//     ['east', 'up', shape]
//   ]
// }

const needBlocksStated = {}

const groupedBlocksRules = {
  // button: block => block.includes('button'),
  // pressure_plate: block => block.includes('pressure_plate'),
  // sign: block => block.includes('_sign'),
  // sapling: block => block.includes('_sapling'),
}
const groupedBlocksOutput = {}

outer: for (const interestedBlock of [...interestedBlocksNoStates, ...interestedBlocksStates]) {
  for (const [block, func] of Object.entries(groupedBlocksRules)) {
    if (func(interestedBlock)) {
      groupedBlocksOutput[block] ??= []
      groupedBlocksOutput[block].push(interestedBlock)
      continue outer
    }
  }

  const hasStates = interestedBlocksStates.includes(interestedBlock)
  if (hasStates) {
    const states = blocksStates[interestedBlock]
    if (!states) {
      console.log('no states', interestedBlock)
      continue
    }
    if (!states.variants) {
      if (!states.multipart) {
        console.log('no variants', interestedBlock)
        continue
      }
      let outputStates = {}
      for (const { when } of states.multipart) {
        if (when) {
          for (const [key, value] of Object.entries(when)) {
            if (key === 'OR') {
              for (const or of value) {
                for (const [key, value] of Object.entries(or)) {
                  const str = `${key}=${value}`
                  outputStates[str] = true
                }
              }
              continue
            }
            const str = `${key}=${value}`
            outputStates[str] = true
          }
        }
      }
      needBlocksStated[interestedBlock] = outputStates
      continue
    }
    if (Object.keys(states.variants).length === 1 && states.variants['']) {
      needBlocksStated[interestedBlock] = false
    } else {
      needBlocksStated[interestedBlock] = Object.fromEntries(Object.entries(states.variants).map(([key, value]) => [key, true]))
    }
  } else {
    needBlocksStated[interestedBlock] = false
  }
  // let vars = []
  // Object.keys(variants).forEach(variant => {
  //   if (variant !== '') vars.push(variant)
  // })
  // needBlocksVariants.push({
  //   block: interestedBlock,
  //   variants: vars
  // })
}

fs.writeFileSync('scripts/needBlocks.json', JSON.stringify(needBlocksStated))

// console.log(interestedBlocks.includes('lever'))

// read latest block states

// read block model elements & combine
