import { supportedVersions } from 'minecraft-data'

const ignoredVersionsRegex = /(^0\.30c$)|w|-pre|-rc/

export default supportedVersions.pc.filter(v => !ignoredVersionsRegex.test(v))
