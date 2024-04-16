import { statsEnd, statsStart } from '../../../src/topRightStats'

// wrapper for now
export class ViewerWrapper {
    previousWindowWidth: number
    previousWindowHeight: number
    globalObject = globalThis as any
    stopRenderOnBlur = true
    addedToPage = false
    renderInterval = 0
    fpsInterval

    constructor(public canvas: HTMLCanvasElement, public renderer?: THREE.WebGLRenderer) {
    }
    addToPage (startRendering = true) {
        if (this.addedToPage) throw new Error('Already added to page')
        let pixelRatio = window.devicePixelRatio || 1 // todo this value is too high on ios, need to check, probably we should use avg, also need to make it configurable
        if (this.renderer) {
            if (!this.renderer.capabilities.isWebGL2) pixelRatio = 1 // webgl1 has issues with high pixel ratio (sometimes screen is clipped)
            this.renderer.setPixelRatio(pixelRatio)
            this.renderer.setSize(window.innerWidth, window.innerHeight)
        } else {
            this.canvas.width = window.innerWidth * pixelRatio
            this.canvas.height = window.innerHeight * pixelRatio
        }
        this.previousWindowWidth = window.innerWidth
        this.previousWindowHeight = window.innerHeight

        this.canvas.id = 'viewer-canvas'
        document.body.appendChild(this.canvas)

        if (this.renderer) this.globalObject.renderer = this.renderer
        this.addedToPage = true

        let max = 0
        this.fpsInterval = setInterval(() => {
            if (max > 0) {
                viewer.world.droppedFpsPercentage = this.renderedFps / max
            }
            max = Math.max(this.renderedFps, max)
            this.renderedFps = 0
        }, 1000)
        if (startRendering) {
            this.globalObject.requestAnimationFrame(this.render.bind(this))
        }
        if (typeof window !== 'undefined') {
            // this.trackWindowFocus()
        }
    }

    windowFocused = true
    trackWindowFocus () {
        window.addEventListener('focus', () => {
            this.windowFocused = true
        })
        window.addEventListener('blur', () => {
            this.windowFocused = false
        })
    }

    dispose () {
        if (!this.addedToPage) throw new Error('Not added to page')
        document.body.removeChild(this.canvas)
        this.renderer?.dispose()
        // this.addedToPage = false
        clearInterval(this.fpsInterval)
    }


    renderedFps = 0
    lastTime = performance.now()
    delta = 0
    preRender = () => { }
    postRender = () => { }
    render (time: DOMHighResTimeStamp) {
        if (this.globalObject.stopLoop) return
        for (const fn of beforeRenderFrame) fn()
        this.globalObject.requestAnimationFrame(this.render.bind(this))
        if (this.globalObject.stopRender || this.renderer?.xr.isPresenting || (this.stopRenderOnBlur && !this.windowFocused)) return
        if (this.renderInterval) {
            this.delta += time - this.lastTime
            this.lastTime = time
            if (this.delta > this.renderInterval) {
                this.delta %= this.renderInterval
                // continue rendering
            } else {
                return
            }
        }
        this.preRender()
        statsStart()
        // ios bug: viewport dimensions are updated after the resize event
        if (this.previousWindowWidth !== window.innerWidth || this.previousWindowHeight !== window.innerHeight) {
            this.resizeHandler()
            this.previousWindowWidth = window.innerWidth
            this.previousWindowHeight = window.innerHeight
        }
        viewer.render()
        this.renderedFps++
        statsEnd()
        this.postRender()
    }

    resizeHandler () {
        const width = window.innerWidth
        const height = window.innerHeight

        viewer.camera.aspect = width / height
        viewer.camera.updateProjectionMatrix()

        if (this.renderer) {
            this.renderer.setSize(width, height)
        }
        // canvas updated by renderer

        // if (viewer.composer) {
        //     viewer.updateComposerSize()
        // }
    }
}
