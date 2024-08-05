import { test, expect } from 'vitest'
import { setup } from './mesherTester'
import supportedVersions from '../../../../../src/supportedVersions.mjs'

const lastVersion = supportedVersions.at(-1)

const addPositions = [
  // [[0, 0, 0], 'diamond_block'],
  // [[1, 0, 0], 'stone'],
  // [[-1, 0, 0], 'stone'],
  // [[0, 1, 0], 'stone'],
  // [[0, -1, 0], 'stone'],
  // [[0, 0, 1], 'stone'],
  // [[0, 0, -1], 'stone'],
] as const

test('Known blocks are not rendered', () => {
  const { mesherWorld, getGeometry, pos, mcData } = setup(lastVersion, addPositions as any)
  const ignoreAsExpected = ['air', 'cave_air', 'void_air', 'barrier', 'water', 'lava', 'moving_piston', 'light']

  let time = 0
  let times = 0
  const missingBlocks = {}/*  as {[number, number]} */
  const erroredBlocks = {}/*  as {[number, number]} */
  for (const block of mcData.blocksArray) {
    if (ignoreAsExpected.includes(block.name)) continue
    // if (block.maxStateId! - block.minStateId! > 100) continue
    // for (let i = block.minStateId!; i <= block.maxStateId!; i++) {
    for (let i = block.defaultState!; i <= block.defaultState!; i++) {
      // if (block.transparent) continue
      mesherWorld.setBlockStateId(pos, i)
      const start = performance.now()
      const { centerFaces, totalTiles, centerTileNeighbors, attr } = getGeometry()
      time += performance.now() - start
      times++
      if (centerFaces === 0) {
        const objAdd = attr.hadErrors ? erroredBlocks : missingBlocks
        if (objAdd[block.name]) continue
        objAdd[block.name] = true
        // invalidBlocks[block.name] = [i - block.defaultState!, centerTileNeighbors]
        // console.log('INVALID', block.name, centerTileNeighbors, i - block.minStateId)
      }
    }
  }
  console.log('Average time', time / times)
  // should be fixed, but to avoid regressions & for visibility
  expect(missingBlocks).toMatchInlineSnapshot(`
    {
      "bubble_column": true,
      "end_gateway": true,
      "end_portal": true,
      "structure_void": true,
      "trial_spawner": true,
    }
  `)
  expect(erroredBlocks).toMatchInlineSnapshot(`
    {
      "black_glazed_terracotta": true,
      "blue_glazed_terracotta": true,
      "brown_glazed_terracotta": true,
      "cyan_glazed_terracotta": true,
      "gray_glazed_terracotta": true,
      "green_glazed_terracotta": true,
      "light_blue_glazed_terracotta": true,
      "light_gray_glazed_terracotta": true,
      "lime_glazed_terracotta": true,
      "magenta_glazed_terracotta": true,
      "orange_glazed_terracotta": true,
      "pink_glazed_terracotta": true,
      "purple_glazed_terracotta": true,
      "red_glazed_terracotta": true,
      "white_glazed_terracotta": true,
      "yellow_glazed_terracotta": true,
    }
  `)
})
