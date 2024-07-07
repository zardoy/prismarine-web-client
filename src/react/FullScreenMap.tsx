import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { DragGesture, WheelGesture, ScrollGesture, MoveGesture, PinchGesture } from '@use-gesture/vanilla'
import Gesto from 'gesto'

export default () => {
    const ref = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = ref.current!
        const { scene, camera, renderer, addCube, onDestroy } = initScene(canvas)

        // const size = 16 * 4 * 1
        const size = 10
        for (let x = -size / 2; x < size / 2; x++) {
            for (let z = -size / 2; z < size / 2; z++) {
                addCube(x, z)
            }
        }
        return () => {
            renderer.dispose()
            onDestroy()
        }
    }, [])

    return <canvas
        style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            touchAction: 'none',
        }}
        ref={ref}
    />
}

const initScene = (canvas: HTMLCanvasElement) => {
    const abortController = new AbortController()

    const renderer = new THREE.WebGLRenderer({ canvas })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setClearColor(0x000000, 1)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000)

    camera.position.set(0, 80, 0)
    // look down
    camera.rotation.set(-Math.PI / 2, 0, 0, 'ZYX')


    const onResize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight)
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize, { signal: abortController.signal })
    onResize()

    let debugText = 'test'
    const debugTextEl = document.createElement('div')
    debugTextEl.style.position = 'fixed'
    debugTextEl.style.top = '0'
    debugTextEl.style.left = '0'
    debugTextEl.style.background = 'rgba(0, 0, 0, 0.5)'
    debugTextEl.style.color = 'white'
    debugTextEl.style.fontSize = '10px'
    debugTextEl.style.padding = '5px'
    document.body.appendChild(debugTextEl)

    renderer.setAnimationLoop(() => {
        renderer.render(scene, camera)
        debugTextEl.innerText = debugText
    })

    // register controls

    const gestures = [] as { destroy: () => void }[]
    const gesture = new DragGesture(canvas, ({ movement: [mx, my] }) => {
        camera.position.x -= mx * 0.001
        camera.position.z -= my * 0.001
    })
    const wheel = new WheelGesture(canvas, ({ delta: [dx, dy] }) => {
        camera.position.y += dy * 0.01
    })
    const pinch = new PinchGesture(canvas, ({ delta, movement: [ox, oy], pinching, origin }) => {
        console.log([ox, oy], delta, pinching, origin)
    })
    gestures.push(wheel)
    gestures.push(gesture)

    let scale = 1
    // const gesto = new Gesto(canvas, {
    //     container: window,
    //     pinchOutside: true,
    // }).on('drag', ({ deltaX, deltaY }) => {
    //     camera.position.x -= deltaX * 0.01
    //     camera.position.z -= deltaY * 0.01
    // }).on('pinchStart', (e) => {
    //     e.datas.scale = scale
    // }).on('pinch', ({ datas: { scale: newScale } }) => {
    //     scale = newScale
    //     console.log(scale)
    //     camera.position.y += newScale * 0.01
    // })


    return {
        scene,
        camera,
        renderer,
        onDestroy: () => {
            abortController.abort()
            for (const gesture of gestures) {
                gesture.destroy()
            }
            // gesto.unset()
        },
        addCube (x, z) {
            const geometry = new THREE.BoxGeometry(1, 1, 1)
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
            const cube = new THREE.Mesh(geometry, material)
            cube.position.set(x, 0, z)
            scene.add(cube)
        }
    }
}

document.addEventListener('gesturestart', (e) => e.preventDefault())
document.addEventListener('gesturechange', (e) => e.preventDefault())
