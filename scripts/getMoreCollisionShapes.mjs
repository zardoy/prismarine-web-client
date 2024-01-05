import minecraftData from 'minecraft-data'
import minecraftAssets from 'minecraft-assets'

const latestData = minecraftData('1.20.2')

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
  'rail',
  'powered_rail',
  'activator_rail',
  'detector_rail',
  'mangrove_propagule'
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

const shapes = latestData.blockCollisionShapes;
const fullShape = shapes.shapes[1]
const outputJson = {}

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
  return true
}).map(d => d.name)

const { blocksStates, blocksModels } = minecraftAssets(latestData.version.minecraftVersion)

// const addShapeIf = {
//   redstone: [
//     ['east', 'up', shape]
//   ]
// }

const needBlocks = []
const needBlocksVariants = []

const groupedBlocksRules = {
  button: block => block.includes('button'),
  pressure_plate: block => block.includes('pressure_plate'),
  sign: block => block.includes('_sign'),
  sapling: block => block.includes('_sapling'),
}
const groupedBlocksOutput = {}

outer: for (const interestedBlock of interestedBlocks) {
  for (const [block, func] of Object.entries(groupedBlocksRules)) {
    if (func(interestedBlock)) {
      groupedBlocksOutput[block] ??= []
      groupedBlocksOutput[block].push(interestedBlock)
      continue outer
    }
  }

  const {variants} = blocksStates[interestedBlock]
  if (!variants) {
    //
    continue
  }
  if (Object.keys(variants).length === 1) {
    needBlocks.push(interestedBlock)
    continue
  }
  let vars = []
  Object.keys(variants).forEach(variant => {
    if (variant !== '') vars.push(variant)
  })
  needBlocksVariants.push({
    block: interestedBlock,
    variants: vars
  })
}

console.log(needBlocks)

// console.log(interestedBlocks.includes('lever'))

// read latest block states

// read block model elements & combine
