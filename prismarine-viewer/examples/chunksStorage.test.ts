import { test, expect } from 'vitest'
import { ChunksStorage } from './chunksStorage'

globalThis.reportError = err => {
  throw err
}
test('Free areas', () => {
  const storage = new ChunksStorage()
  storage.chunkSizeDisplay = 1
  const blocksWith1 = Object.fromEntries(Array.from({ length: 100 }).map((_, i) => {
    return [`${i},0,0`, 1 as any]
  }))
  const blocksWith2 = Object.fromEntries(Array.from({ length: 100 }).map((_, i) => {
    return [`${i},0,0`, 2 as any]
  }))
  const blocksWith3 = Object.fromEntries(Array.from({ length: 10 }).map((_, i) => {
    return [`${i},0,0`, 3 as any]
  }))
  const blocksWith4 = Object.fromEntries(Array.from({ length: 10 }).map((_, i) => {
    return [`${i},0,0`, 4 as any]
  }))

  const getRangeString = () => {
    const ranges = {}
    let lastNum = storage.allBlocks[0]?.[3]
    let lastNumI = 0
    for (let i = 0; i < storage.allBlocks.length; i++) {
      const num = storage.allBlocks[i]?.[3]
      if (lastNum !== num || i === storage.allBlocks.length - 1) {
        const inclusive = i === storage.allBlocks.length - 1
        ranges[`[${lastNumI}-${i}${inclusive ? ']' : ')'}`] = lastNum
        lastNum = num
        lastNumI = i
      }
    }
    return ranges
  }

  const testRange = (start, end, number) => {
    for (let i = start; i < end; i++) {
      expect(storage.allBlocks[i]?.[3], `allblocks ${i} (range ${start}-${end})`).toBe(number)
    }
  }

  storage.addChunk(blocksWith1, '0,0,0')
  storage.addChunk(blocksWith2, '1,0,0')
  expect(storage.chunksMap).toMatchInlineSnapshot(`
    Map {
      "0,0,0" => 0,
      "1,0,0" => 1,
    }
  `)
  expect(storage.chunks).toMatchInlineSnapshot(`
    [
      {
        "free": false,
        "length": 100,
        "x": 0,
        "z": 0,
      },
      {
        "free": false,
        "length": 100,
        "x": 1,
        "z": 0,
      },
    ]
  `)
  expect(storage.findBelongingChunk(100)).toMatchInlineSnapshot(`
    {
      "chunk": {
        "free": false,
        "length": 100,
        "x": 1,
        "z": 0,
      },
      "index": 1,
    }
  `)
  expect(getRangeString()).toMatchInlineSnapshot(`
    {
      "[0-100)": 1,
      "[100-199]": 2,
    }
  `)

  storage.removeChunk('0,0,0')
  expect(storage.chunks[0].free).toBe(true)
  expect(storage.chunks[0].length).toBe(100)

  expect(getRangeString()).toMatchInlineSnapshot(`
    {
      "[0-100)": undefined,
      "[100-199]": 2,
    }
  `)

  storage.addChunk(blocksWith3, `0,0,2`)
  expect(storage.chunksMap).toMatchInlineSnapshot(`
    Map {
      "1,0,0" => 1,
      "0,0,2" => 0,
    }
  `)
  expect(storage.chunks).toMatchInlineSnapshot(`
    [
      {
        "free": false,
        "length": 100,
        "x": 0,
        "z": 2,
      },
      {
        "free": false,
        "length": 100,
        "x": 1,
        "z": 0,
      },
    ]
  `)
  expect(getRangeString()).toMatchInlineSnapshot(`
    {
      "[0-10)": 3,
      "[10-100)": undefined,
      "[100-199]": 2,
    }
  `)

  // update (no map changes)
  storage.addChunk(blocksWith4, `0,0,2`)
  expect(storage.chunksMap).toMatchInlineSnapshot(`
    Map {
      "1,0,0" => 1,
      "0,0,2" => 0,
    }
  `)
  expect(storage.chunks).toMatchInlineSnapshot(`
    [
      {
        "free": false,
        "length": 100,
        "x": 0,
        "z": 2,
      },
      {
        "free": false,
        "length": 100,
        "x": 1,
        "z": 0,
      },
    ]
  `)
  expect(getRangeString()).toMatchInlineSnapshot(`
    {
      "[0-10)": 4,
      "[10-100)": undefined,
      "[100-199]": 2,
    }
  `)

  storage.addChunk(blocksWith3, `0,0,3`)
  expect(storage.chunksMap).toMatchInlineSnapshot(`
    Map {
      "1,0,0" => 1,
      "0,0,2" => 0,
      "0,0,3" => 2,
    }
  `)
  expect(storage.chunks).toMatchInlineSnapshot(`
    [
      {
        "free": false,
        "length": 100,
        "x": 0,
        "z": 2,
      },
      {
        "free": false,
        "length": 100,
        "x": 1,
        "z": 0,
      },
      {
        "free": false,
        "length": 10,
        "x": 0,
        "z": 3,
      },
    ]
  `)
  expect(getRangeString()).toMatchInlineSnapshot(`
    {
      "[0-10)": 4,
      "[10-100)": undefined,
      "[100-200)": 2,
      "[200-209]": 3,
    }
  `)
  expect(storage.allBlocks.length).toBe(210)

  // update 0,0,2
  storage.addChunk(blocksWith1, `0,0,2`)
  expect(storage.chunksMap).toMatchInlineSnapshot(`
    Map {
      "1,0,0" => 1,
      "0,0,3" => 2,
      "0,0,2" => 0,
    }
  `)
  expect(storage.chunks).toMatchInlineSnapshot(`
    [
      {
        "free": false,
        "length": 100,
        "x": 0,
        "z": 2,
      },
      {
        "free": false,
        "length": 100,
        "x": 1,
        "z": 0,
      },
      {
        "free": false,
        "length": 10,
        "x": 0,
        "z": 3,
      },
    ]
  `)
  expect(getRangeString()).toMatchInlineSnapshot(`
    {
      "[0-100)": 1,
      "[100-200)": 2,
      "[200-209]": 3,
    }
  `)
})
