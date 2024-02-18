//@ts-check
import { build } from 'esbuild'
import { existsSync } from 'node:fs'
import Module from "node:module"
import { dirname } from 'node:path'
import supportedVersions from '../src/supportedVersions.mjs'

if (existsSync('dist/mc-data') && !process.argv.includes('-f')) {
  console.log('using cached prepared data')
  process.exit(0)
}

const require = Module.createRequire(import.meta.url)

const dataPaths = require('minecraft-data/minecraft-data/data/dataPaths.json')

function toMajor (version) {
  const [a, b] = (version + '').split('.')
  return `${a}.${b}`
}

const grouped = {}

for (const [version, data] of Object.entries(dataPaths.pc)) {
  if (!supportedVersions.includes(version)) continue
  const major = toMajor(version)
  grouped[major] ??= {}
  grouped[major][version] = data
}

const versionToNumber = (ver) => {
  const [x, y = '0', z = '0'] = ver.split('.')
  return +`${x.padStart(2, '0')}${y.padStart(2, '0')}${z.padStart(2, '0')}`
}

console.log('preparing data')
console.time('data prepared')
let builds = []
for (const [major, versions] of Object.entries(grouped)) {
  // if (major !== '1.19') continue
  let contents = 'Object.assign(window.mcData, {\n'
  for (const [version, dataSet] of Object.entries(versions)) {
    contents += `    '${version}': {\n`
    for (const [dataType, dataPath] of Object.entries(dataSet)) {
      if (dataType === 'blockCollisionShapes' && versionToNumber(version) >= versionToNumber('1.13')) {
        contents += `      get ${dataType} () { return window.globalGetCollisionShapes?.("${version}") },\n`
        continue
      }
      const loc = `minecraft-data/data/${dataPath}/`
      contents += `      get ${dataType} () { return require("./${loc}${dataType}.json") },\n`
    }
    contents += '    },\n'
  }
  contents += '})'

  const promise = build({
    bundle: true,
    outfile: `dist/mc-data/${major}.js`,
    stdin: {
      contents,

      resolveDir: dirname(require.resolve('minecraft-data')),
      sourcefile: `mcData${major}.js`,
      loader: 'js',
    },
    metafile: true,
  })
  // require('fs').writeFileSync('dist/mc-data/metafile.json', JSON.stringify(promise.metafile), 'utf8')
  builds.push(promise)
}
await Promise.all(builds)
console.timeEnd('data prepared')
