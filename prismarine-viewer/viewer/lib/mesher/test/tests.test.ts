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
  const invalidBlocks = {}/*  as {[number, number]} */
  for (const block of mcData.blocksArray) {
    if (ignoreAsExpected.includes(block.name)) continue
    // if (block.maxStateId! - block.minStateId! > 100) continue
    // for (let i = block.minStateId!; i <= block.maxStateId!; i++) {
    for (let i = block.defaultState!; i <= block.defaultState!; i++) {
      // if (block.transparent) continue
      mesherWorld.setBlockStateId(pos, i)
      const start = performance.now()
      const { centerFaces, totalTiles, centerTileNeighbors } = getGeometry()
      time += performance.now() - start
      times++
      if (centerFaces === 0) {
        if (invalidBlocks[block.name]) continue
        invalidBlocks[block.name] = true
        // invalidBlocks[block.name] = [i - block.defaultState!, centerTileNeighbors]
        // console.log('INVALID', block.name, centerTileNeighbors, i - block.minStateId)
      }
    }
  }
  console.log('Average time', time / times)
  // should be fixed, but to avoid regressions & for visibility
  expect(invalidBlocks).toMatchInlineSnapshot(`
    {
      "black_banner": true,
      "black_bed": true,
      "black_candle": true,
      "black_wall_banner": true,
      "blue_banner": true,
      "blue_bed": true,
      "blue_candle": true,
      "blue_wall_banner": true,
      "brown_banner": true,
      "brown_bed": true,
      "brown_candle": true,
      "brown_wall_banner": true,
      "bubble_column": true,
      "candle": true,
      "creeper_head": true,
      "creeper_wall_head": true,
      "cyan_banner": true,
      "cyan_bed": true,
      "cyan_candle": true,
      "cyan_wall_banner": true,
      "dragon_head": true,
      "dragon_wall_head": true,
      "end_gateway": true,
      "end_portal": true,
      "gray_banner": true,
      "gray_bed": true,
      "gray_candle": true,
      "gray_wall_banner": true,
      "green_banner": true,
      "green_bed": true,
      "green_candle": true,
      "green_wall_banner": true,
      "light_blue_banner": true,
      "light_blue_bed": true,
      "light_blue_candle": true,
      "light_blue_wall_banner": true,
      "light_gray_banner": true,
      "light_gray_bed": true,
      "light_gray_candle": true,
      "light_gray_wall_banner": true,
      "lime_banner": true,
      "lime_bed": true,
      "lime_candle": true,
      "lime_wall_banner": true,
      "magenta_banner": true,
      "magenta_bed": true,
      "magenta_candle": true,
      "magenta_wall_banner": true,
      "orange_banner": true,
      "orange_bed": true,
      "orange_candle": true,
      "orange_wall_banner": true,
      "piglin_head": true,
      "piglin_wall_head": true,
      "pink_banner": true,
      "pink_bed": true,
      "pink_candle": true,
      "pink_petals": true,
      "pink_wall_banner": true,
      "player_head": true,
      "player_wall_head": true,
      "powder_snow_cauldron": true,
      "purple_banner": true,
      "purple_bed": true,
      "purple_candle": true,
      "purple_wall_banner": true,
      "red_banner": true,
      "red_bed": true,
      "red_candle": true,
      "red_wall_banner": true,
      "repeater": true,
      "sea_pickle": true,
      "skeleton_skull": true,
      "skeleton_wall_skull": true,
      "snow": true,
      "structure_void": true,
      "turtle_egg": true,
      "water_cauldron": true,
      "white_banner": true,
      "white_bed": true,
      "white_candle": true,
      "white_wall_banner": true,
      "wither_skeleton_skull": true,
      "wither_skeleton_wall_skull": true,
      "yellow_banner": true,
      "yellow_bed": true,
      "yellow_candle": true,
      "yellow_wall_banner": true,
      "zombie_head": true,
      "zombie_wall_head": true,
    }
  `)
})
