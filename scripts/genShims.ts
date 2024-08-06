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

fs.mkdirSync('./generated', { recursive: true })
fs.writeFileSync('./generated/minecraft-data-data.js', mcDataContents, 'utf8')

// app resources

let headerImports = ''
let resourcesContent = 'export const appReplacableResources: { [key in Keys]: { content: any, resourcePackPath: string, cssVar?: string, cssVarRepeat?: number } } = {\n'
let resourcesContentOriginal = 'export const resourcesContentOriginal = {\n'
const keys = [] as string[]

for (const resource of appReplacableResources) {
  const { path, ...rest } = resource
  const name = path.split('/').slice(-4).join('_').replace('.png', '').replaceAll('-', '_').replaceAll('.', '_')
  keys.push(name)
  headerImports += `import ${name} from '${path.replace('../node_modules/', '')}'\n`
  resourcesContent += `
  '${name}': {
    content: ${name},
    resourcePackPath: 'minecraft/textures/${path.slice(path.indexOf('other-textures/') + 'other-textures/'.length).split('/').slice(1).join('/')}',
    ...${JSON.stringify(rest)}
  },
`
  resourcesContentOriginal += `
  '${name}': ${name},
`
}

resourcesContent += '}\n'
resourcesContent += `type Keys = ${keys.map(k => `'${k}'`).join(' | ')}\n`
resourcesContentOriginal += '}\n'
resourcesContent += resourcesContentOriginal

fs.mkdirSync('./src/generated', { recursive: true })
fs.writeFileSync('./src/generated/resources.ts', headerImports + '\n' + resourcesContent, 'utf8')
