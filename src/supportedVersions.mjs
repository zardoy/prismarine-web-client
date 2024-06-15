import { supportedVersions } from 'minecraft-data'

const ignoredVersionsRegex = /(^0\.30c$)|w|-pre|-rc/

export default supportedVersions.pc.filter(x => x !== '1.7').filter(v => !ignoredVersionsRegex.test(v))
