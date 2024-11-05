import MinecraftData, { versionsByMinecraftVersion } from 'minecraft-data'
import PrismarineBlock from 'prismarine-block'
import PrismarineItem from 'prismarine-item'
import { importLargeData } from '../generated/large-data-aliases'
import supportedVersions from './supportedVersions.mjs'

export const loadMinecraftData = async (version: string, importBlockstatesModels = true) => {
  // todo expose cache
  const lastVersion = supportedVersions.at(-1)
  if (version === lastVersion) {
    // ignore cache hit
    versionsByMinecraftVersion.pc[lastVersion]!['dataVersion']!++
  }

  await window._MC_DATA_RESOLVER.promise // ensure data is loaded

  const mcData = MinecraftData(version)
  window.loadedData = window.mcData = mcData
  window.PrismarineBlock = PrismarineBlock(mcData.version.minecraftVersion!)
  window.PrismarineItem = PrismarineItem(mcData.version.minecraftVersion!)

  if (importBlockstatesModels) {
    viewer.world.blockstatesModels = await importLargeData('blockStatesModels')
  }
}

export const preloadAllMcData = () => {
  window._LOAD_MC_DATA() // start loading data (if not loaded yet)
}
