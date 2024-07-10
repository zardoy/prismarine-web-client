/// <reference types="@webgpu/types" />
import * as THREE from 'three'
import { BlockFaceType, BlockType } from './shared'
import * as tweenJs from '@tweenjs/tween.js'
//@ts-ignore
//@ts-ignore
import { createWorkerProxy } from './workerProxy'
import { WebgpuRenderer } from './webgpuRenderer'

export let allSides = [] as ([number, number, number, BlockFaceType] | undefined)[]
globalThis.allSides = allSides
let allSidesAdded = 0
let needsSidesUpdate = false

let chunksArrIndexes = {}
let freeArrayIndexes = [] as [number, number][]
let sidePositions
let lastNotUpdatedIndex
let lastNotUpdatedArrSize
let animationTick = 0

const camera = new THREE.PerspectiveCamera(75, 1 / 1, 0.1, 1000)
globalThis.camera = camera

let webgpuRenderer: WebgpuRenderer | undefined

setInterval(() => {
    if (!webgpuRenderer) return
    // console.log('FPS:', renderedFrames)
    postMessage({ type: 'fps', fps: webgpuRenderer.renderedFrames })
    webgpuRenderer.renderedFrames = 0
}, 1000)

export const updateSize = (width, height) => {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
}


let fullReset

const updateCubesWhenAvailable = (pos) => {
    if (webgpuRenderer?.ready) {
        webgpuRenderer.updateSides(pos)
    } else {
        setTimeout(updateCubesWhenAvailable, 100)
    }
}

let started = false
let newWidth: number | undefined
let newHeight: number | undefined
let autoTickUpdate = undefined as number | undefined
export const workerProxyType = createWorkerProxy({
    canvas (canvas, imageBlob, isPlayground, FragShaderOverride) {
        started = true
        webgpuRenderer = new WebgpuRenderer(canvas, imageBlob, isPlayground, camera, FragShaderOverride)
        globalThis.webglRendererWorker = webgpuRenderer
    },
    startRender () {
        if (!webgpuRenderer) return
        webgpuRenderer.rendering = true
    },
    stopRender () {
        if (!webgpuRenderer) return
        webgpuRenderer.rendering = false
    },
    resize (newWidth, newHeight) {
        newWidth = newWidth
        newHeight = newHeight
        updateSize(newWidth, newHeight)
    },
    addBlocksSection (tiles: Record<string, BlockType>, key: string) {
        const currentLength = allSides.length
        // in: object - name, out: [x, y, z, name]
        const newData = Object.entries(tiles).flatMap(([key, value]) => {
            const [x, y, z] = key.split(',').map(Number)
            const block = value as BlockType
            return block.faces.map((side) => {
                return [x, y, z, side] as [number, number, number, BlockFaceType]
            })
        })
        // find freeIndexes if possible
        const freeArea = freeArrayIndexes.find(([startIndex, endIndex]) => endIndex - startIndex >= newData.length)
        if (freeArea) {
            const [startIndex, endIndex] = freeArea
            allSides.splice(startIndex, newData.length, ...newData)
            lastNotUpdatedIndex ??= startIndex
            const freeAreaIndex = freeArrayIndexes.indexOf(freeArea)
            freeArrayIndexes[freeAreaIndex] = [startIndex + newData.length, endIndex]
            if (freeArrayIndexes[freeAreaIndex][0] >= freeArrayIndexes[freeAreaIndex][1]) {
                freeArrayIndexes.splice(freeAreaIndex, 1)
                // todo merge
            }
            lastNotUpdatedArrSize = newData.length
            console.log('using free area', freeArea)
        }

        chunksArrIndexes[key] = [currentLength, currentLength + newData.length]
        let i = 0;
        while (i < newData.length) {
            allSides.splice(currentLength + i, 0, ...newData.slice(i, i + 1024));
            i += 1024;
        }
        lastNotUpdatedIndex ??= currentLength
        // if (webglRendererWorker && webglRendererWorker.notRenderedAdditions < 5) {
        updateCubesWhenAvailable(currentLength)
        // }
    },
    addBlocksSectionDone () {
        updateCubesWhenAvailable(lastNotUpdatedIndex)
        lastNotUpdatedIndex = undefined
        lastNotUpdatedArrSize = undefined
    },
    removeBlocksSection (key) {
        return
        // fill data with 0
        const [startIndex, endIndex] = chunksArrIndexes[key]
        for (let i = startIndex; i < endIndex; i++) {
            allSides[i] = undefined
        }
        lastNotUpdatedArrSize = endIndex - startIndex
        updateCubesWhenAvailable(startIndex)

        // freeArrayIndexes.push([startIndex, endIndex])

        // // merge freeArrayIndexes TODO
        // if (freeArrayIndexes.at(-1)[0] === freeArrayIndexes.at(-2)?.[1]) {
        //     const [startIndex, endIndex] = freeArrayIndexes.pop()!
        //     const [startIndex2, endIndex2] = freeArrayIndexes.pop()!
        //     freeArrayIndexes.push([startIndex2, endIndex])
        // }
    },
    camera (newCam) {
        if (webgpuRenderer?.isPlayground) {
            camera.rotation.order = 'ZYX'
            new tweenJs.Tween(camera.rotation).to({ x: newCam.rotation.x, y: newCam.rotation.y, z: newCam.rotation.z }, 50).start()
        } else {
            camera.rotation.set(newCam.rotation.x, newCam.rotation.y, newCam.rotation.z, 'ZYX')
        }
        if (newCam.position.x === 0 && newCam.position.y === 0 && newCam.position.z === 0) {
            // initial camera position
            camera.position.set(newCam.position.x, newCam.position.y, newCam.position.z)
        } else {
            new tweenJs.Tween(camera.position).to({ x: newCam.position.x, y: newCam.position.y, z: newCam.position.z }, 50).start()
        }
    },
    animationTick (frames, tick) {
        if (frames <= 0) {
            autoTickUpdate = undefined
            animationTick = 0
            return
        }
        if (tick === -1) {
            autoTickUpdate = frames
        } else {
            autoTickUpdate = undefined
            animationTick = tick % 20 // todo update automatically in worker
        }
    },
    fullReset () {
        fullReset()
    },
    exportData () {
        const exported = exportData()
        postMessage({ type: 'exportData', data: exported }, undefined as any, [exported.sides.buffer])
    },
    loadFixture (json) {
        // allSides = json.map(([x, y, z, face, textureIndex]) => {
        //     return [x, y, z, { face, textureIndex }] as [number, number, number, BlockFaceType]
        // })
        const dataSize = json.length / 5
        for (let i = 0; i < json.length; i += 5) {
            allSides.push([json[i], json[i + 1], json[i + 2], { side: json[i + 3], textureIndex: json[i + 4] }])
        }
        updateCubesWhenAvailable(0)
    },
})

globalThis.testDuplicates = () => {
    const duplicates = allSides.filter((value, index, self) => self.indexOf(value) !== index)
    console.log('duplicates', duplicates)
}

const exportData = () => {
    // Calculate the total length of the final array
    const totalLength = allSides.length * 5

    // Create a new Int16Array with the total length
    const flatData = new Int16Array(totalLength)

    // Fill the flatData array
    for (let i = 0; i < allSides.length; i++) {
        const sideData = allSides[i]
        if (!sideData) continue
        const [x, y, z, side] = sideData
        flatData.set([x, y, z, side.side, side.textureIndex], i * 5)
    }

    return { sides: flatData }
}

setInterval(() => {
    if (autoTickUpdate) {
        animationTick = (animationTick + 1) % autoTickUpdate
    }
}, 1000 / 20)
