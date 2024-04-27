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

const { mesherWorld, getGeometry, pos, mcData } = setup('1.18.1', addPositions as any)

// mesherWorld.setBlockStateId(pos, mcData.blocksByName.soul_sand.defaultState)

// console.log(getGeometry().centerTileNeighbors)
