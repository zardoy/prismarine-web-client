import legacyJson from '../../../../src/preflatMap.json'

export const getPreflatBlock = (block, reportIssue?: () => void) => {
  const b = block
  b._properties = {}

  const namePropsStr = legacyJson.blocks[b.type + ':' + b.metadata] || findClosestLegacyBlockFallback(b.type, b.metadata, reportIssue)
  if (namePropsStr) {
    b.name = namePropsStr.split('[')[0]
    const propsStr = namePropsStr.split('[')?.[1]?.split(']')
    if (propsStr) {
      const newProperties = Object.fromEntries(propsStr.join('').split(',').map(x => {
        let [key, val] = x.split('=')
        if (!isNaN(val)) val = parseInt(val, 10)
        return [key, val]
      }))
      b._properties = newProperties
    }
  }
  return b
}

const findClosestLegacyBlockFallback = (id, metadata, reportIssue) => {
  reportIssue?.()
  for (const [key, value] of Object.entries(legacyJson.blocks)) {
    const [idKey, meta] = key.split(':')
    if (idKey === id) return value
  }
  return null
}
