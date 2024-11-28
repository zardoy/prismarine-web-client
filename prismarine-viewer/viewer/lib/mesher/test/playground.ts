import { BlockNames } from '../../../../../src/mcDataTypes'
import { setup } from './mesherTester'

const addPositions = [
  // [[0, 0, 0], 'diamond_block'],
  [[1, 0, 0], 'stone'],
  [[-1, 0, 0], 'stone'],
  [[0, 1, 0], 'stone'],
  [[0, -1, 0], 'stone'],
  [[0, 0, 1], 'stone'],
  [[0, 0, -1], 'stone'],
] as const

const { mesherWorld, getGeometry, pos, mcData } = setup('1.21.1', addPositions as any)

// mesherWorld.setBlockStateId(pos, 712)
// mesherWorld.setBlockStateId(pos, mcData.blocksByName.stone_slab.defaultState)
mesherWorld.setBlockStateId(pos, 11_225)

console.log(getGeometry().centerTileNeighbors)
