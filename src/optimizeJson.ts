import { versionToNumber } from 'prismarine-viewer/viewer/prepare/utils'

type IdMap = Record<string, number>

type DiffData = {
  removed: number[],
  changed: any[],
  added
}

type SourceData = {
  keys: IdMap,
  properties: IdMap
  source: Record<number, any>
  diffs: Record<string, DiffData>
  arrKey?
  __IS_OPTIMIZED__: true
}

export default class JsonOptimizer {
  keys = {} as IdMap
  idToKey = {} as Record<number, string>
  properties = {} as IdMap
  source = {}
  previousKeys = [] as number[]
  previousValues = {} as Record<number, any>
  diffs = {} as Record<string, DiffData>

  constructor (public arrKey?: string, public ignoreChanges = false, public ignoreRemoved = false) { }

  export () {
    const { keys, properties, source, arrKey, diffs } = this
    return {
      keys,
      properties,
      source,
      arrKey,
      diffs,
      '__IS_OPTIMIZED__': true
    } satisfies SourceData
  }

  diffObj (diffing): DiffData {
    const removed = [] as number[]
    const changed = [] as any[]
    const { arrKey, ignoreChanges, ignoreRemoved } = this
    const added = [] as number[]

    if (!diffing || typeof diffing !== 'object') throw new Error('diffing data is not object')
    if (Array.isArray(diffing) && !arrKey) throw new Error('arrKey is required for arrays')
    const diffingObj = Array.isArray(diffing) ? Object.fromEntries(diffing.map(x => {
      const key = x[arrKey!]
      return [key, x]
    })) : diffing

    const possiblyNewKeys = Object.keys(diffingObj)
    this.keys ??= {}
    this.properties ??= {}
    let lastRootKeyId = Object.values(this.keys).length
    let lastItemKeyId = Object.values(this.properties).length
    for (const key of possiblyNewKeys) {
      this.keys[key] ??= lastRootKeyId++
      this.idToKey[this.keys[key]] = key
    }
    const DEBUG = false

    const addDiff = (key, newVal, prevVal) => {
      const valueMapped = [] as any[]
      const isItemObj = typeof newVal === 'object' && newVal
      if (isItemObj) {
        for (const [prop, val] of Object.entries(newVal)) {
          // mc-data: why push only changed props? eg for blocks only stateId are different between all versions so we skip a lot of duplicated data like block props
          if (!isEqualStructured(newVal[prop], prevVal[prop])) {
            let keyMapped = this.properties[prop]
            if (keyMapped === undefined) {
              this.properties[prop] = lastItemKeyId++
              keyMapped = this.properties[prop]
            }
            valueMapped.push(DEBUG ? prop : keyMapped, newVal[prop])
          }
        }
      }
      const keyId = this.keys[key]
      changed.push(DEBUG ? key : keyId, isItemObj ? valueMapped : newVal)
    }
    for (const [id, sourceVal] of Object.entries(this.source)) {
      const key = this.idToKey[id]
      const diffVal = diffingObj[key]
      if (!ignoreChanges && diffVal !== undefined) {
        this.previousValues[id] ??= this.source[id]
        const prevVal = this.previousValues[id]
        if (!isEqualStructured(prevVal, diffVal)) {
          addDiff(key, diffVal, prevVal)
        }
        this.previousValues[id] = diffVal
      }
    }
    for (const [key, val] of Object.entries(diffingObj)) {
      const id = this.keys[key]
      if (!this.source[id]) {
        this.source[id] = val
      }
      added.push(id)
    }

    for (const previousKey of this.previousKeys) {
      const key = this.idToKey[previousKey]
      if (!diffingObj[key] && !ignoreRemoved) {
        removed.push(previousKey)
      }
    }

    for (const toRemove of removed) {
      this.previousKeys.splice(this.previousKeys.indexOf(toRemove), 1)
    }

    for (const previousKey of this.previousKeys) {
      const index = added.indexOf(previousKey)
      if (index === -1) continue
      added.splice(index, 1)
    }

    this.previousKeys = [...this.previousKeys, ...added]

    return {
      removed,
      changed,
      added
    }
  }

  recordDiff (key: string, diffObj: string) {
    const diff = this.diffObj(diffObj)
    this.diffs[key] = diff
  }

  static isOptimizedChangeDiff (changePossiblyArrDiff) {
    if (!Array.isArray(changePossiblyArrDiff)) return false
    if (changePossiblyArrDiff.length % 2 !== 0) return false
    for (let i = 0; i < changePossiblyArrDiff.length; i += 2) {
      if (typeof changePossiblyArrDiff[i] !== 'number') return false
    }
    return true
  }

  static restoreData ({ keys, properties, source, arrKey, diffs }: SourceData, targetKey: string) {
    // if (!diffs[targetKey]) throw new Error(`The requested data to restore with key ${targetKey} does not exist`)
    const keysById = Object.fromEntries(Object.entries(keys).map(x => [x[1], x[0]]))
    const propertiesById = Object.fromEntries(Object.entries(properties).map(x => [x[1], x[0]]))
    const dataByKeys = {} as Record<string, any>
    for (const [versionKey, { added, changed, removed }] of Object.entries(diffs)) {
      if (versionToNumber(versionKey) >= versionToNumber(targetKey)) {
        for (const toAdd of added) {
          dataByKeys[toAdd] = source[toAdd]
        }
        for (const toRemove of removed) {
          delete dataByKeys[toRemove]
        }
        for (let i = 0; i < changed.length; i += 2) {
          const key = changed[i]
          const change = changed[i + 1]
          const isOptimizedChange = JsonOptimizer.isOptimizedChangeDiff(change)
          if (isOptimizedChange) {
            // apply optimized diff
            for (let k = 0; k < change.length; k += 2) {
              const propId = change[k]
              const newVal = change[k + 1]
              const prop = propertiesById[propId]
              // const prop = propId
              if (prop === undefined) throw new Error(`Property id change is undefined: ${propId}`)
              dataByKeys[key][prop] = newVal
            }
          } else {
            dataByKeys[key] = change
          }
        }
      }
    }
    if (arrKey) {
      return Object.values(dataByKeys)
    } else {
      return Object.fromEntries(Object.entries(dataByKeys).map(([key, val]) => [keysById[key], val]))
    }
  }

  static resolveDefaults (arr) {
    if (!Array.isArray(arr)) throw new Error('not an array')
    const propsValueCount = {} as {
      [key: string]: {
        [val: string]: number
      }
    }
    for (const obj of arr) {
      if (typeof obj !== 'object' || !obj) continue
      for (const [key, val] of Object.entries(obj)) {
        const valJson = JSON.stringify(val)
        propsValueCount[key] ??= {}
        propsValueCount[key][valJson] ??= 0
        propsValueCount[key][valJson] += 1
      }
    }
    const defaults = Object.fromEntries(Object.entries(propsValueCount).map(([prop, values]) => {
      const defaultValue = Object.entries(values).sort(([, count1], [, count2]) => count2 - count1)[0][0]
      return [prop, defaultValue]
    }))

    const newData = [] as any[]
    const noData = {}
    for (const [i, obj] of arr.entries()) {
      if (typeof obj !== 'object' || !obj) {
        newData.push(obj)
        continue
      }
      for (const key of Object.keys(defaults)) {
        const val = obj[key]
        if (!val) {
          noData[key] ??= []
          noData[key].push(key)
          continue
        }
        if (defaults[key] === JSON.stringify(val)) {
          delete obj[key]
        }
      }
      newData.push(obj)
    }

    return {
      data: newData,
      defaults
    }
  }
}

const isEqualStructured = (val1, val2) => {
  return JSON.stringify(val1) === JSON.stringify(val2)
}
