//@ts-check
import { build } from 'esbuild'
import { existsSync } from 'node:fs'
import Module from "node:module"
import { dirname } from 'node:path'
import supportedVersions from '../src/supportedVersions.mjs'
import { gzipSizeFromFileSync } from 'gzip-size'
import fs from 'fs'
import  {default as _JsonOptimizer}  from './optimizeJson'
import { buildSync } from 'esbuild'

/** @type {typeof _JsonOptimizer} */
//@ts-ignore
const JsonOptimizer = _JsonOptimizer.default

// console.log(a.diff_main(JSON.stringify({ a: 1 }), JSON.stringify({ a: 1, b: 2 })))

const require = Module.createRequire(import.meta.url)

const dataPaths = require('minecraft-data/minecraft-data/data/dataPaths.json')

function toMajor (version) {
  const [a, b] = (version + '').split('.')
  return `${a}.${b}`
}

const versions = {}
const dataTypes = new Set()

for (const [version, dataSet] of Object.entries(dataPaths.pc)) {
  if (!supportedVersions.includes(version)) continue
  for (const type of Object.keys(dataSet)) {
    dataTypes.add(type)
  }
  versions[version] = dataSet
}

const versionToNumber = (ver) => {
  const [x, y = '0', z = '0'] = ver.split('.')
  return +`${x.padStart(2, '0')}${y.padStart(2, '0')}${z.padStart(2, '0')}`
}

// if not included here (even as {}) will not be bundled & accessible!
const dataTypeBundling = {
  language: {
    ignoreRemoved: true,
    ignoreChanges: true
  },
  blocks: {
    arrKey: 'name',
    // ignoreRemoved: true,
    // genChanges (source, diff) {
    //   const diffs = {}
    //   const newItems = {}
    //   for (const [key, val] of Object.entries(diff)) {
    //     const src = source[key]
    //     if (!src) {
    //       newItems[key] = val
    //       continue
    //     }
    //     const { minStateId, defaultState, maxStateId } = val
    //     if (defaultState === undefined || minStateId === src.minStateId || maxStateId === src.maxStateId || defaultState === src.defaultState) continue
    //     diffs[key] = [minStateId, defaultState, maxStateId]
    //   }
    //   return {
    //     stateChanges: diffs
    //   }
    // },
    // ignoreChanges: true
  },
  items: {
    arrKey: 'name'
  },
  attributes: {
    arrKey: 'name'
  },
  particles: {
    arrKey: 'name'
  },
  effects: {
    arrKey: 'name'
  },
  enchantments: {
    arrKey: 'name'
  },
  instruments: {
    arrKey: 'name'
  },
  foods: {
    arrKey: 'name'
  },
  entities: {
    arrKey: 'name'
  },
  materials: {},
  windows: {
    arrKey: 'name'
  },
  version: {
    raw: true
  },
  tints: {},
  biomes: {
    arrKey: 'name'
  },
  entityLoot: {
    arrKey: 'name'
  },
  blockLoot: {
    arrKey: 'name'
  },
  recipes: {}, // todo
  blockCollisionShapes: {},
  loginPacket: {},
  protocol: {},
  sounds: {
    arrKey: 'name'
  }
}

const notBundling = [...dataTypes.keys()].filter(x => !Object.keys(dataTypeBundling).includes(x))
console.log("Not bundling minecraft-data data:", notBundling)

let contents = 'Object.assign(window.mcData, {\n'
let previousData = {}
const diffSources = {}
const versionsArr = Object.entries(versions)
// const versionsArr = Object.entries(versions).slice(-1)
for (const [i, [version, dataSet]] of versionsArr.reverse().entries()) {
  // console.log(i, '/', versionsArr.length)
  contents += `    '${version}': {\n`
  for (const [dataType, dataPath] of Object.entries(dataSet)) {
    const config = dataTypeBundling[dataType]
    if (!config) continue
    if (dataType === 'blockCollisionShapes' && versionToNumber(version) >= versionToNumber('1.13')) {
      contents += `      get ${dataType} () { return window.globalGetCollisionShapes?.("${version}") },\n`
      continue
    }
    const loc = `minecraft-data/data/${dataPath}/`
    const dataPathAbsolute = require.resolve(`minecraft-data/${loc}${dataType}`)
    // const data = fs.readFileSync(dataPathAbsolute, 'utf8')
    const dataRaw = require(dataPathAbsolute)
    let data
    if (config.raw) {
      data = dataRaw
    } else {
      if (!diffSources[dataType]) {
        diffSources[dataType] = new JsonOptimizer()
        diffSources[dataType].source = dataRaw
        if (config.arrKey) diffSources[dataType].arrKey = config.arrKey
        if (config.ignoreChanges) diffSources[dataType].ignoreChanges = config.ignoreChanges
        if (config.ignoreRemoved) diffSources[dataType].ignoreRemoved = config.ignoreRemoved
      }
      data = diffSources[dataType].diffObj(dataRaw)
    }
    if (config.genChanges && previousData[dataType]) {
      const changes = config.genChanges(previousData[dataType], dataRaw)
      Object.assign(data, changes)
    }
    previousData[dataType] = dataRaw
    contents += `      get ${dataType} () { return ${JSON.stringify(data)} },\n`
  }
  contents += '    },\n'
}
contents += '})'
contents += `\n\nwindow.sources = ${JSON.stringify(Object.fromEntries(Object.entries(diffSources).map(x => [x[0], x[1].export()])), null, 4)}`

const filePath = './generated/new.js'
buildSync({
  bundle: true,
  minify: true,
  outfile: filePath,
  stdin: {
    contents,

    loader: 'js',
  },
})
// fs.writeFileSync(filePath, contents, 'utf8')

console.log('size', fs.lstatSync(filePath).size / 1024 / 1024, gzipSizeFromFileSync(filePath) / 1024 / 1024)
