import { generateSpiralMatrix } from 'flying-squid/dist/utils'
import { Viewer } from '../viewer/lib/viewer'
import { options } from '../../src/optionsStorage'

let worker

declare const viewer: Viewer

const sendWorkerMessage = (message: any, transfer?: Transferable[]) => {
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
    if (isWaitingToUpload) return
    isWaitingToUpload = true
    viewer.waitForChunksToRender().then(() => {
        isWaitingToUpload = false
        for (const [key, data] of Object.entries(viewer.world.newChunks)) {
            sendWorkerMessage({
                type: 'addBlocksSection', data, key
            })
        }
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
    addFpsCounter()
    sendWorkerMessage({
        canvas: offscreen,
        imageBlob,
        isPlayground
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


const addFpsCounter = () => {
    const fpsCounter = document.createElement('div')
    fpsCounter.id = 'fps-counter'
    fpsCounter.style.position = 'fixed'
    fpsCounter.style.top = '0'
    fpsCounter.style.right = '0'
    // gray bg
    fpsCounter.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
    fpsCounter.style.color = 'white'
    fpsCounter.style.padding = '2px'
    fpsCounter.style.fontFamily = 'monospace'
    fpsCounter.style.fontSize = '12px'
    fpsCounter.style.zIndex = '10000'
    document.body.appendChild(fpsCounter)
    let prevTimeout
    worker.addEventListener('message', (e) => {
        if (e.data.type === 'fps') {
            fpsCounter.innerText = `FPS: ${e.data.fps}`
            if (prevTimeout) clearTimeout(prevTimeout);
            prevTimeout = setTimeout(() => {
                fpsCounter.innerText = '<hanging>'
            }, 1002)
        }
    })
}
