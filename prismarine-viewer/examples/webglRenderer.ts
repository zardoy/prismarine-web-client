import { Viewer } from '../viewer/lib/viewer'

let worker

declare const viewer: Viewer

export const makeRender = () => { }

let cubePositions
let updateCubes
export const updateCubePositions = () => {
    updateCubes()
}

export let cubePositionsRaw = [] as [number, number, number, string | null][]

const sendWorkerMessage = (message: any, transfer?: Transferable[]) => {
    worker.postMessage(message, transfer)
    // replacable by onmessage
}

export const initWebglRenderer = async (version: string | undefined) => {
    const imageBlob = await fetch(`./textures/${version}.png`).then((res) => res.blob())
    const canvas = document.createElement('canvas')
    canvas.width = window.innerWidth * window.devicePixelRatio
    canvas.height = window.innerHeight * window.devicePixelRatio
    document.body.appendChild(canvas)
    canvas.id = 'viewer-canvas'
    const offscreen = canvas.transferControlToOffscreen()

    // replacable by initWebglRenderer
    worker = new Worker('./webglRendererWorker.js')
    sendWorkerMessage({
        canvas: offscreen,
        imageBlob,
        blockStatesJson: viewer.world.downloadedBlockStatesData
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
        if (!focused) return

        if (oldWidth !== window.innerWidth || oldHeight !== window.innerHeight) {
            oldWidth = window.innerWidth
            oldHeight = window.innerHeight
            sendWorkerMessage({
                type: 'resize',
                newWidth: window.innerWidth * window.devicePixelRatio,
                height: window.innerHeight * window.devicePixelRatio
            })
        }
        if (['rotation', 'position'].some((key) => oldCamera[key] !== viewer.camera[key])) {
            // TODO fix
            for (const [key, val] of Object.entries(oldCamera)) {
                for (const key2 of Object.keys(val)) {
                    oldCamera[key][key2] = viewer.camera[key][key2]
                }
            }
            sendWorkerMessage({
                type: 'camera',
                camera: oldCamera
            })
        }
    }

    requestAnimationFrame(mainLoop)
}
