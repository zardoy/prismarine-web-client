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
}

export default class JsonOptimizer {
    keys = {} as IdMap
    idToKey = {} as Record<number, string>
    properties = {} as IdMap
    source = {}
    previousKeys = [] as number[]
    diffs = {} as Record<string, DiffData>

    constructor(public arrKey?: string, public ignoreChanges = false, public ignoreRemoved = false) { }

    export () {
        const { keys, properties, source, arrKey, diffs } = this
        return {
            keys,
            properties,
            source,
            arrKey,
            diffs
        } satisfies SourceData
    }

    diffObj (diffing): DiffData {
        const removed = [] as number[]
        const changed = [] as any[]
        const { arrKey, ignoreChanges, ignoreRemoved } = this
        const added = [] as number[]
        // const added = {} as any

        if (!diffing || typeof diffing !== 'object') throw new Error('diffing data is not object')
        if (Array.isArray(diffing) && !arrKey) throw new Error('arrKey is required for arrays')
        const diffingObj = Array.isArray(diffing) ? Object.fromEntries(diffing.map(x => {
            const key = x[arrKey]
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

        const addDiff = (key, newVal, prevVal) => {
            // const valueMapped = {} as Record<string, any>
            const valueMapped = [] as any[]
            const isItemObj = typeof newVal === 'object' && newVal
            if (isItemObj) {
                for (const [key, val] of Object.entries(newVal)) {
                    if (!isEqualStructured(newVal[key], prevVal[key])) {
                        let keyMapped = this.properties[key]
                        if (keyMapped === undefined) {
                            this.properties[key] = lastItemKeyId++
                            keyMapped = this.properties[key]
                        }
                        // valueMapped[keyMapped] = newVal[key]
                        // valueMapped.push(key, newVal[key])
                        valueMapped.push(keyMapped, newVal[key])
                    }
                }
            }
            changed.push(this.keys[key], isItemObj ? valueMapped : newVal)
            // changed.push(key, valueMapped)
        }
        for (const [id, val] of Object.entries(this.source)) {
            const key = this.idToKey[id]
            const diffVal = diffingObj[key]
            if (!ignoreChanges && diffVal !== undefined) {
                if (!isEqualStructured(val, diffVal)) {
                    addDiff(key, val, diffVal)
                }
            }
        }
        for (const [key, val] of Object.entries(diffingObj)) {
            const id = this.keys[key]
            if (!this.source[id]) {
                this.source[id] = val
                continue
            }
            added.push(id)
        }

        for (const previousKey of this.previousKeys) {
            const key = this.idToKey[previousKey]
            if (!diffingObj[key] && !ignoreRemoved) {
                removed.push(previousKey)
                this.previousKeys.splice(this.previousKeys.indexOf(previousKey), 1)
            }
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

    static isOptimizedChangeDiff(changePossiblyArrDiff) {
        if (!Array.isArray(changePossiblyArrDiff)) return false
        if (changePossiblyArrDiff.length % 2 !== 0) return false
        for (let i = 0; i < changePossiblyArrDiff.length; i += 2) {
            if (typeof changePossiblyArrDiff[i] !== 'number') return false
        }
        return true
    }

    static restoreData ({ keys, properties, source, arrKey }: SourceData, key: string) {
        // const data = arrKey ? [] : {}
        // if (arrKey) {
        //     data.push(...added ?? [])
        // } else {
        //     Object.assign(data, added ?? {})
        // }
        // const changeData = (id, newData) => {
        //     const key = keys[id]
        //     if (arrKey) {
        //         const index = data.findIndex(a => a[arrKey] === key)
        //         const oldData = data[index]
        //         const isOptimizedChange = JsonOptimizer.isOptimizedChangeDiff(newData)
        //         let newDataMapped = {} as Record<string, any>
        //         if (isOptimizedChange) {
        //             for (let i = 0; i < newData.length / 2; i++) {
        //                 let id = newData[i]
        //                 let val = newData[i + 1]
        //                 const key = properties[id]
        //                 newDataMapped[key] = val
        //             }
        //         }
        //         data.splice(index, 1, isOptimizedChange ? { ...oldData, ...newDataMapped } : newData)
        //     } else {
        //         data[key] = newData
        //     }
        // }
        // for (const id of removed) {
        //     changeData(id, undefined)
        // }
    }

    static resolveDefaults (arr) {
        if (!Array.isArray(arr)) throw Error('not an array')
        const propsValueCount = {} as {
            [key: string]: {
                [val: string]: number
            }
        }
        for (const obj of arr) {
            if (typeof obj !== 'object' || !obj) continue
            for (const [key, val] of Object.entries(obj)) {
                const valJson = JSON.stringify(val);
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
