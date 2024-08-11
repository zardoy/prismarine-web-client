type IdMap = Record<string, number>

type DiffData = {
    removed: number[],
    changed: any[],
    added
}

type SourceData = {
    keys: IdMap,
    properties: IdMap
    source
    arrKey?
}

export default class JsonOptimizer {
    keys = {} as IdMap
    properties = {} as IdMap
    source = {}
    arrKey?
    ignoreChanges = false
    ignoreRemoved = false

    export () {
        const { keys, properties, source, arrKey } = this
        return {
            keys,
            properties,
            source,
            arrKey,
        } satisfies SourceData
    }

    diffObj (diffing): DiffData {
        const removed = [] as number[]
        const changed = [] as any[]
        const { source, arrKey, ignoreChanges, ignoreRemoved } = this
        const added = arrKey ? [] : {} as any
        // const added = {} as any

        if (!source || !diffing || typeof source !== 'object' || typeof diffing !== 'object') throw new Error('something is not object')
        if (Array.isArray(source) !== Array.isArray(diffing)) throw new Error('something is arr and something is not')
        if (Array.isArray(source) && !arrKey) throw new Error('arrKey is required for arrays')
        const sourceObj = Array.isArray(source) ? Object.fromEntries(source.map(x => {
            const key = x[arrKey]
            return [key, x]
        })) : source
        const diffingObj = Array.isArray(diffing) ? Object.fromEntries(diffing.map(x => {
            const key = x[arrKey]
            return [key, x]
        })) : diffing

        const curKeysMerged = [...new Set([...Object.keys(sourceObj), ...Object.keys(diffingObj)])]
        this.keys ??= {}
        this.properties ??= {}
        let lastRootKeyId = Object.values(this.keys).length
        let lastItemKeyId = Object.values(this.properties).length
        for (const key of curKeysMerged) {
            if (!this.keys[key]) this.keys[key] = lastRootKeyId++
        }

        const addDiff = (key, newVal, prevVal) => {
            // const valueMapped = {} as Record<string, any>
            const valueMapped = [] as any[]
            if (typeof newVal === 'object' && newVal) {
                for (const [key, val] of Object.entries(newVal)) {
                    if (!isEqualStructured(newVal[key], prevVal[key])) {
                        let keyMapped = this.properties[key]
                        if (!keyMapped) {
                            this.properties[key] = lastItemKeyId++
                            keyMapped = this.properties[key]
                        }
                        // valueMapped[keyMapped] = newVal[key]
                        // valueMapped.push(key, newVal[key])
                        valueMapped.push(keyMapped, newVal[key])
                    }
                }
            } else {
                throw new Error('item is not an object')
            }
            changed.push(this.keys[key], valueMapped)
            // changed.push(key, valueMapped)
        }
        for (const [key, val] of Object.entries(sourceObj)) {
            const diffVal = diffingObj[key];
            if (!diffVal && !ignoreRemoved) {
                removed.push(this.keys[key])
                continue
            }
            if (!ignoreChanges) {
                if (!isEqualStructured(val, diffVal)) {
                    addDiff(key, val, diffVal)
                }
            }
        }
        for (const [key, val] of Object.entries(diffingObj)) {
            if (!sourceObj[key]) {
                if (arrKey) added.push(val)
                else added[key] = val
                // added[key] = val
                continue
            }
        }

        return {
            removed,
            changed,
            added
        }
    }

    static restoreData ({ keys, properties, source, arrKey }: SourceData, { removed, changed, added }: DiffData) {
        const data = source
        if (arrKey) {
            data.push(...added ?? [])
        } else {
            Object.assign(data, added ?? {})
        }
        const changeData = (id, newData) => {
            const key = keys[id]
            if (arrKey) {
                const index = data.findIndex(a => a[arrKey] === key)
                const oldData = data[index]
                let newDataMapped
                if (newData && typeof newDataMapped === 'object') {
                    for (let i = 0; i < newData.length / 2; i++) {
                        let id = newData[i]
                        let val = newData[i + 1]
                        const key = properties[id]
                        newDataMapped[key] = val
                    }
                    newDataMapped
                }
                data.splice(index, 1, newDataMapped ? { ...oldData, ...newDataMapped } : newDataMapped)
            } else {
                data[key] = newData
            }
        }
        for (const id of removed) {
            changeData(id, undefined)
        }
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
