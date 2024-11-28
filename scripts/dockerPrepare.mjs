//@ts-check
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

// write release tag
const commitShort = execSync('git rev-parse --short HEAD').toString().trim()
fs.writeFileSync('./assets/release.json', JSON.stringify({ latestTag: `${commitShort} (docker)` }), 'utf8')

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
delete packageJson.optionalDependencies
fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2), 'utf8')

const packageJsonViewer = JSON.parse(fs.readFileSync('./prismarine-viewer/package.json', 'utf8'))
delete packageJsonViewer.optionalDependencies
fs.writeFileSync('./prismarine-viewer/package.json', JSON.stringify(packageJsonViewer, null, 2), 'utf8')
