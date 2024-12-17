//@ts-check

export const dynamicMcDataFiles = ['language', 'blocks', 'items', 'attributes', 'particles', 'effects', 'enchantments', 'instruments', 'foods', 'entities', 'materials', 'version', 'windows', 'tints', 'biomes', 'recipes', 'blockCollisionShapes', 'loginPacket', 'protocol', 'sounds']

const toMajorVersion = version => {
  const [a, b] = (String(version)).split('.')
  return `${a}.${b}`
}

export const getMcDataForWorker = async (version) => {
  const mcDataRaw = await import('minecraft-data/data.js') // path is not actual
  const allMcData = mcDataRaw.pc[version] ?? mcDataRaw.pc[toMajorVersion(version)]
  const mcData = {
    version: JSON.parse(JSON.stringify(allMcData.version))
  }
  for (const key of dynamicMcDataFiles) {
    mcData[key] = allMcData[key]
  }
  return mcData
}
