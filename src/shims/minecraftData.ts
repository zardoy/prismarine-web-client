import { versionToNumber } from 'prismarine-viewer/viewer/prepare/utils'
import JsonOptimizer from '../optimizeJson'
import minecraftDataOptimizedJson from '../generated/minecraft-data-optimized.json'

const resolver = Promise.withResolvers()
window._MC_DATA_READY = resolver.promise

window.mcData = new Proxy({}, {
  get (t, version: string) {
    const dataTypes = Object.keys(minecraftDataOptimizedJson)
    console.log(`restoring data for ${version}: ${dataTypes.join(', ')}`)
    const allRestored = {}
    for (const dataType of dataTypes) {
      if (dataType === 'blockCollisionShapes' && versionToNumber(version) >= versionToNumber('1.13')) {
        return window.globalGetCollisionShapes?.(version)
      }

      const data = dataType[dataType]
      if (data.__IS_OPTIMIZED__) {
        allRestored[dataType] = JsonOptimizer.restoreData(data, version)
      } else {
        allRestored[dataType] = data
      }
    }
    return allRestored
  }
})
