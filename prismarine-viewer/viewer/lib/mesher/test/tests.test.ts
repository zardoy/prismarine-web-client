import { test, expect } from 'vitest'
import { setup } from './mesherTester'

const version = '1.18.1'

const addPositions = [
    // [[0, 0, 0], 'diamond_block'],
    [[1, 0, 0], 'stone'],
    [[-1, 0, 0], 'stone'],
    [[0, 1, 0], 'stone'],
    [[0, -1, 0], 'stone'],
    [[0, 0, 1], 'stone'],
    [[0, 0, -1], 'stone'],
] as const

test('Known blocks are not rendered', () => {
    const { mesherWorld, getGeometry, pos, mcData } = setup(version, addPositions as any)

    let time = 0
    let times = 0
    const invalidBlocks = {}/*  as {[number, number]} */
    for (const block of mcData.blocksArray) {
        if (block.maxStateId! - block.minStateId! > 100) continue
        for (let i = block.minStateId!; i <= block.maxStateId!; i++) {
            if (block.transparent) continue
            mesherWorld.setBlockStateId(pos, i)
            const start = performance.now()
            const { centerFaces, totalTiles, centerTileNeighbors } = getGeometry()
            time += performance.now() - start
            times++
            if (centerFaces === 0 && centerTileNeighbors !== 0) {
                if (invalidBlocks[block.name]) continue
                invalidBlocks[block.name] = [i - block.minStateId!, centerTileNeighbors]
                // console.log('INVALID', block.name, centerTileNeighbors, i - block.minStateId)
            }
        }
    }
    console.log('Average time', time / times)
    // Fully expected
    expect(invalidBlocks).toMatchInlineSnapshot(`
      {
        "powder_snow": [
          0,
          6,
        ],
      }
    `)
})
