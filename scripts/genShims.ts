import fs from 'fs'
import MinecraftData from 'minecraft-data'
import MCProtocol from 'minecraft-protocol'
import { appReplacableResources } from '../src/resourcesSource'

const { supportedVersions, defaultVersion } = MCProtocol

// gen generated/minecraft-data-data.js

const data = MinecraftData(defaultVersion)
const defaultVersionObj = {
    [defaultVersion]: {
        version: data.version,
        protocol: data.protocol,
    }
}

const mcDataContents = `window.mcData ??= ${JSON.stringify(defaultVersionObj)};module.exports = { pc: window.mcData }`

fs.writeFileSync('./generated/minecraft-data-data.js', mcDataContents, 'utf8')

// app resources

let headerImports = ''
let resourcesContent = 'export const appReplacableResources = {'

for (const resource of appReplacableResources) {
    const { path, ...rest } = resource
    const name = path.split('/').slice(-4).join('_').replace('.png', '').replaceAll('-', '_').replaceAll('.', '_')
    headerImports += `import ${name} from '${path.replace('../node_modules/', '')}'\n`
    resourcesContent += `
  '${name}': {
    content: ${name},
    ...${JSON.stringify(rest)}
  },
`
}

resourcesContent += '}'

fs.writeFileSync('./generated/resources.ts', headerImports + '\n' + resourcesContent, 'utf8')
