import { test, expect } from 'vitest'
import { ChunksStorage } from './chunksStorage'

globalThis.reportError = err => {
  throw err
}
const testTile = {} as any
test('Free areas', () => {
  const storage = new ChunksStorage()
  const blocks100 = Object.fromEntries(Array.from({ length: 100 }).map((_, i) => {
    return [`${i},0,0`, testTile]
  }))
  const blocks100Test = Object.fromEntries(Array.from({ length: 100 }).map((_, i) => {
    return [`${i},0,0`, 10 as any]
  }))
  const blocks10 = Object.fromEntries(Array.from({ length: 10 }).map((_, i) => {
    return [`${i},0,0`, testTile]
  }))

  storage.addChunk(blocks100, '0,0,0')
  storage.addChunk(blocks100Test, '1,0,0')
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
        "x": 0.0625,
        "z": 0,
      },
    ]
  `)
  expect(storage.findBelongingChunk(100)).toMatchInlineSnapshot(`
    {
      "chunk": {
        "free": false,
        "length": 100,
        "x": 0.0625,
        "z": 0,
      },
      "index": 1,
    }
  `)
  expect(storage.allBlocks[99]?.[3]).not.toBe(10)
  for (let i = 100; i < 200; i++) {
    expect(storage.allBlocks[i]?.[3]).toBe(10)
  }

  storage.removeChunk('0,0,0')
  expect(storage.chunks[0].free).toBe(true)
  expect(storage.chunks[0].length).toBe(100)

  storage.addChunk(blocks10, `0,0,2`)
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
        "z": 0.125,
      },
      {
        "free": false,
        "length": 100,
        "x": 0.0625,
        "z": 0,
      },
    ]
  `)

  // update (no map changes)
  storage.addChunk(blocks10, `0,0,2`)
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
        "z": 0.125,
      },
      {
        "free": false,
        "length": 100,
        "x": 0.0625,
        "z": 0,
      },
    ]
  `)

  storage.addChunk(blocks10, `0,0,3`)
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
        "z": 0.125,
      },
      {
        "free": false,
        "length": 100,
        "x": 0.0625,
        "z": 0,
      },
      {
        "free": false,
        "length": 10,
        "x": 0,
        "z": 0.1875,
      },
    ]
  `)
})
