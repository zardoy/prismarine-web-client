import fs from 'fs'
import MinecraftData from 'minecraft-data'
import MCProtocol from 'minecraft-protocol'

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
