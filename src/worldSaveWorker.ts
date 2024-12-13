import './workerWorkaround'
import fs from 'fs'
import './fs2'
import { Anvil } from 'prismarine-provider-anvil'
import WorldLoader from 'prismarine-world'

import * as browserfs from 'browserfs'
import { generateSpiralMatrix } from 'flying-squid/dist/utils'
import '../dist/mc-data/1.14'
import { oneOf } from '@zardoy/utils'

console.log('install')
browserfs.install(window)
window.fs = fs

export interface ReadChunksRequest {
  version: string,

}

onmessage = (msg) => {
  globalThis.readSkylight = false
  if (msg.data.type === 'readChunks') {
    browserfs.configure({
      fs: 'MountableFileSystem',
      options: {
        '/data': { fs: 'IndexedDB' },
      },
    }, async () => {
      const version = '1.14.4'
      const AnvilLoader = Anvil(version)
      const World = WorldLoader(version) as any
      // const folder = '/data/worlds/Greenfield v0.5.3-3/region'
      const { folder } = msg.data
      const world = new World(() => {
        throw new Error('Not implemented')
      }, new AnvilLoader(folder))
      // const chunks = generateSpiralMatrix(20)
      const { chunks } = msg.data
      // const spawn = {
      //   x: 113,
      //   y: 64,
      // }
      console.log('starting...')
      console.time('columns')
      const loadedColumns = [] as any[]
      const columnToTransfarable = (chunk) => {
        return {
          biomes: chunk.biomes,
          // blockEntities: chunk.blockEntities,
          // sectionMask: chunk.sectionMask,
          sections: chunk.sections,
          // skyLightMask: chunk.skyLightMask,
          // blockLightMask: chunk.blockLightMask,
          // skyLightSections: chunk.skyLightSections,
          // blockLightSections: chunk.blockLightSections
        }
      }

      for (const chunk of chunks) {
        const column = await world.getColumn(chunk[0], chunk[1])
        if (!column) throw new Error(`Column ${chunk[0]} ${chunk[1]} not found`)
        postMessage({
          column: columnToTransfarable(column)
        })
      }
      postMessage({
        type: 'done',
      })

      console.timeEnd('columns')
    })
  }
}

// window.fs = fs
