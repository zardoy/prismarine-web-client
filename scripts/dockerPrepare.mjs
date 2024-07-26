//@ts-check
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
delete packageJson.optionalDependencies
fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2), 'utf8')

const packageJsonViewer = JSON.parse(fs.readFileSync('./prismarine-viewer/package.json', 'utf8'))
delete packageJsonViewer.optionalDependencies
fs.writeFileSync('./prismarine-viewer/package.json', JSON.stringify(packageJsonViewer, null, 2), 'utf8')
