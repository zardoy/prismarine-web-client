import minecraftData from 'minecraft-data'
import fs from 'fs'

const data = minecraftData('1.20.1')

let types = ''
types += `\nexport type BlockNames = ${Object.keys(data.blocksByName).map(blockName => `'${blockName}'`).join(' | ')};`
types += `\nexport type ItemNames = ${Object.keys(data.itemsByName).map(blockName => `'${blockName}'`).join(' | ')};`
types += `\nexport type EntityNames = ${Object.keys(data.entitiesByName).map(blockName => `'${blockName}'`).join(' | ')};`
types += `\nexport type BiomesNames = ${Object.keys(data.biomesByName).map(blockName => `'${blockName}'`).join(' | ')};`
types += `\nexport type EnchantmentNames = ${Object.keys(data.enchantmentsByName).map(blockName => `'${blockName}'`).join(' | ')};`

fs.writeFileSync('./src/mcDataTypes.ts', types, 'utf8')
