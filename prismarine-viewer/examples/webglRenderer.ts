import { generateSpiralMatrix } from 'flying-squid/dist/utils'
import { Viewer } from '../viewer/lib/viewer'
import { options } from '../../src/optionsStorage'
import { addNewStat } from './newStats'

let worker

declare const viewer: Viewer

export const sendWorkerMessage = (message: any, transfer?: Transferable[]) => {
    worker.postMessage(message, transfer)
    // replacable by onmessage
}

let allReceived = false
declare const customEvents
declare const bot
if (typeof customEvents !== 'undefined') {
    customEvents.on('gameLoaded', () => {
        const chunksExpected = generateSpiralMatrix(options.renderDistance)
        let received = 0
        bot.on('chunkColumnLoad', (data) => {
            received++
            if (received === chunksExpected.length) {
                allReceived = true
                // addBlocksSection('all', viewer.world.newChunks)
            }
        })
    })
}


let isWaitingToUpload = false
export const addBlocksSection = (key, data) => {
    sendWorkerMessage({
        type: 'addBlocksSection', data, key
    })
    if (isWaitingToUpload) return
    isWaitingToUpload = true
    viewer.waitForChunksToRender().then(() => {
        isWaitingToUpload = false
        if (allReceived || (true && Object.values(viewer.world.newChunks).length)) {
            sendWorkerMessage({
                type: 'addBlocksSectionDone'
            })
        }
    })
}

export const sendCameraToWorker = () => {
    const cameraData = ['rotation', 'position'].reduce((acc, key) => {
        acc[key] = ['x', 'y', 'z'].reduce((acc2, key2) => {
            acc2[key2] = viewer.camera[key][key2]
            return acc2
        }, {})
        return acc
    }, {})
    sendWorkerMessage({
        type: 'camera',
        camera: cameraData
    })
}

export const removeBlocksSection = (key) => {
    sendWorkerMessage({
        type: 'removeBlocksSection', key
    })
}

let playground = false
export const initWebglRenderer = async (version: string, postRender = () => { }, isPlayground = false) => {
    playground = isPlayground
    viewer.setVersion(version)
    await new Promise(resolve => {
        // console.log('viewer.world.material.map!.image', viewer.world.material.map!.image)
        // viewer.world.material.map!.image.onload = () => {
        //   console.log(this.material.map!.image)
        //   resolve()
        // }
        viewer.world.renderUpdateEmitter.once('blockStatesDownloaded', resolve)
    })
    const imageBlob = await fetch(`./textures/${version}.png`).then((res) => res.blob())
    const canvas = document.createElement('canvas')
    canvas.width = window.innerWidth * window.devicePixelRatio
    canvas.height = window.innerHeight * window.devicePixelRatio
    document.body.appendChild(canvas)
    canvas.id = 'viewer-canvas'

    const offscreen = canvas.transferControlToOffscreen()

    // replacable by initWebglRenderer
    worker = new Worker('./webglRendererWorker.js')
    addFpsCounters()
    sendWorkerMessage({
        canvas: offscreen,
        imageBlob,
        isPlayground,
        FragShaderOverride: localStorage.FragShader
    }, [offscreen])

    let oldWidth = window.innerWidth
    let oldHeight = window.innerHeight
    let oldCamera = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
    }
    let focused = true
    window.addEventListener('focus', () => {
        focused = true
        sendWorkerMessage({ type: 'startRender' })
    })
    window.addEventListener('blur', () => {
        focused = false
        sendWorkerMessage({ type: 'stopRender' })
    })
    const mainLoop = () => {
        requestAnimationFrame(mainLoop)
        //@ts-ignore
        if (!focused || window.stopRender) return

        if (oldWidth !== window.innerWidth || oldHeight !== window.innerHeight) {
            oldWidth = window.innerWidth
            oldHeight = window.innerHeight
            sendWorkerMessage({
                type: 'resize',
                newWidth: window.innerWidth * window.devicePixelRatio,
                height: window.innerHeight * window.devicePixelRatio
            })
        }
        postRender()
        // TODO! do it in viewer to avoid possible delays
        if (playground && ['rotation', 'position'].some((key) => oldCamera[key] !== viewer.camera[key])) {
            // TODO fix
            for (const [key, val] of Object.entries(oldCamera)) {
                for (const key2 of Object.keys(val)) {
                    oldCamera[key][key2] = viewer.camera[key][key2]
                }
            }
            sendCameraToWorker()
        }
    }

    requestAnimationFrame(mainLoop)
}

export const setAnimationTick = (tick: number, frames?: number) => {
    sendWorkerMessage({
        type: 'animationTick',
        tick,
        frames
    })
}

globalThis.exportData = () => {
    worker.postMessage({ type: 'exportData' })
    const controller = new AbortController()
    worker.addEventListener('message', (e) => {
        try {
            const a = document.createElement('a')
            const dataObj = e.data
            const data = JSON.stringify(dataObj)
            const objectURL = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
            a.href = objectURL
            a.download = 'data.json'
            a.click()
            URL.revokeObjectURL(objectURL)
        } finally {
            controller.abort()
        }
    }, { signal: controller.signal })
}


const addFpsCounters = () => {
    const { updateText } = addNewStat('fps')
    let prevTimeout
    worker.addEventListener('message', (e) => {
        if (e.data.type === 'fps') {
            updateText(`FPS: ${e.data.fps}`)
            if (prevTimeout) clearTimeout(prevTimeout);
            prevTimeout = setTimeout(() => {
                updateText('<hanging>')
            }, 1002)
        }
    })

    const { updateText: updateText2 } = addNewStat('fps-main', 90, 0, 20)
    let updates = 0
    const mainLoop = () => {
        requestAnimationFrame(mainLoop)
        updates++
    }
    mainLoop()
    setInterval(() => {
        updateText2(`Main Loop: ${updates}`)
        updates = 0
    }, 1000)
}
