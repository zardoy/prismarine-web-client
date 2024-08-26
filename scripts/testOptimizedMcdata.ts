import JsonOptimizer from '../src/optimizeJson';
import fs from 'fs'
import minecraftData from 'minecraft-data'

// const data = minecraftData('1.20.4')
const json = JSON.parse(fs.readFileSync('./generated/minecraft-data-optimized.json', 'utf8'))

const dataPaths = require('minecraft-data/minecraft-data/data/dataPaths.json')

const validateData = (ver, type) => {
  const target = JsonOptimizer.restoreData(json[type], ver)
  const arrKey = json[type].arrKey
  const originalPath = dataPaths.pc[ver][type]
  const original = require(`minecraft-data/minecraft-data/data/${originalPath}/${type}.json`)
  if (arrKey) {
    const originalKeys = original.map(a => a[arrKey]) as string[]
    for (const [i, item] of originalKeys.entries()) {
      if (originalKeys.indexOf(item) !== i) {
        console.warn(`${type} ${ver} Incorrect source, duplicated arrKey (${arrKey}) ${item}. Ignoring!`) // todo should span instead
        const index = originalKeys.indexOf(item);
        original.splice(index, 1)
        originalKeys.splice(index, 1)
      }
    }
    // if (target.length !== originalKeys.length) {
    //   throw new Error(`wrong arr length: ${target.length} !== ${original.length}`)
    // }
    checkKeys(originalKeys, target.map(a => a[arrKey]))
    for (const item of target as any[]) {
      const keys = Object.entries(item).map(a => a[0])
      const origItem = original.find(a => a[arrKey] === item[arrKey]);
      const keysSource = Object.entries(origItem).map(a => a[0])
      checkKeys(keysSource, keys, true, 'prop keys', true)
      checkObj(origItem, item)
    }
  } else {
    const keysOriginal = Object.keys(original)
    const keysTarget = Object.keys(target)
    checkKeys(keysOriginal, keysTarget)
    for (const key of keysTarget) {
      checkObj(original[key], target[key])
    }
  }
}

const checkObj = (source, diffing) => {
  for (const [key, val] of Object.entries(source)) {
    if (JSON.stringify(val) !== JSON.stringify(diffing[key])) {
      throw new Error(`different value: ${val} ${diffing[key]}`)
    }
  }
}

const checkKeys = (source, diffing, isUniq = true, msg = '', redunantOk = false) => {
  if (isUniq) {
    for (const [i, item] of diffing.entries()) {
      if (diffing.indexOf(item) !== i) {
        throw new Error(`Duplicate: ${item}: ${i} ${diffing.indexOf(item)} ${msg}`)
      }
    }
  }
  for (const key of source) {
    if (!diffing.includes(key)) {
      throw new Error(`Diffing does not include ${key} ${msg}`)
    }
  }
  if (!redunantOk) {
    for (const key of diffing) {
      if (!source.includes(key)) {
        throw new Error(`Source does not include ${key} ${msg}`)
      }
    }
  }
}

// console.log(JsonOptimizer.restoreData(json['blocks'], '1.16.2').slice(0, 5))
// console.log(data.blocksByName.melon_stem.drops)
// test all types + all versions

for (const type of Object.keys(json)) {
  if (!json[type].__IS_OPTIMIZED__) continue
  console.log('validating', type)
  const source = json[type]
  let checkedVer = 0
  for (const ver of Object.keys(source.diffs)) {
    validateData(ver, type)
    checkedVer++
  }
  console.log('Checked versions:', checkedVer)
}
