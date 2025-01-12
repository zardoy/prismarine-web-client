import { supportedVersions, postNettyVersionsByProtocolVersion } from 'minecraft-data'

export const ignoredVersionsRegex = /(^0\.30c$)|w|-pre|-rc/

/** @type {string[]} */
const versionsFromProtocol = Object.values(postNettyVersionsByProtocolVersion.pc).flat().filter(x => !ignoredVersionsRegex.test(x.minecraftVersion)).map(x => x.minecraftVersion)

export default versionsFromProtocol.filter(x => x !== '1.7' && !x.startsWith('1.7.'))
