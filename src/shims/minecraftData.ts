import { versionToNumber } from 'prismarine-viewer/viewer/prepare/utils'
import JsonOptimizer from '../optimizeJson'
import minecraftInitialDataJson from '../../generated/minecraft-initial-data.json'
import { toMajorVersion } from '../utils'

const customResolver = () => {
  const resolver = Promise.withResolvers()
  let resolvedData
  return {
    ...resolver,
    get resolvedData () {
      return resolvedData
    },
    resolve (data) {
      resolver.resolve(data)
      resolvedData = data
    }
  }
}

const optimizedDataResolver = customResolver()
window._MC_DATA_RESOLVER = optimizedDataResolver
window._LOAD_MC_DATA = async () => {
  if (optimizedDataResolver.resolvedData) return
  optimizedDataResolver.resolve(await import('../../generated/minecraft-data-optimized.json'))
}

// 30 seconds
const cacheTtl = 30 * 1000
const cache = new Map<string, any>()
const cacheTime = new Map<string, number>()
const possiblyGetFromCache = (version: string) => {
  if (minecraftInitialDataJson[version] && !optimizedDataResolver.resolvedData) {
    return minecraftInitialDataJson[version]
  }
  if (cache.has(version)) {
    return cache.get(version)
  }
  const inner = () => {
    if (!optimizedDataResolver.resolvedData) {
      throw new Error(`Data for ${version} is not ready yet`)
    }
    const dataTypes = Object.keys(optimizedDataResolver.resolvedData)
    const allRestored = {}
    for (const dataType of dataTypes) {
      if (dataType === 'blockCollisionShapes' && versionToNumber(version) >= versionToNumber('1.13')) {
        const shapes = window.globalGetCollisionShapes?.(version)
        if (shapes) {
          allRestored[dataType] = shapes
          continue
        }
      }

      const data = optimizedDataResolver.resolvedData[dataType]
      if (data.__IS_OPTIMIZED__) {
        allRestored[dataType] = JsonOptimizer.restoreData(data, version)
      } else {
        allRestored[dataType] = data[version] ?? data[toMajorVersion(version)]
      }
    }
    return allRestored
  }
  const data = inner()
  cache.set(version, data)
  cacheTime.set(version, Date.now())
  return data
}
window.allLoadedMcData = new Proxy({}, {
  get (t, version: string) {
    // special properties like $typeof
    if (version.includes('$')) return
    // todo enumerate all props
    return new Proxy({}, {
      get (target, prop) {
        return possiblyGetFromCache(version)[prop]
      },
    })
  }
})

setInterval(() => {
  const now = Date.now()
  for (const [version, time] of cacheTime) {
    if (now - time > cacheTtl) {
      cache.delete(version)
      cacheTime.delete(version)
    }
  }
}, 1000)

export const pc = window.allLoadedMcData
export default { pc }
