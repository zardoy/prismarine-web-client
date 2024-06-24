import * as THREE from 'three'
import { createWorkerProxy } from './workerProxy'
import * as tweenJs from '@tweenjs/tween.js'
import testGeometryJson from '../../examples/test-geometry.json'

let material: THREE.Material
let scene = new THREE.Scene()
let camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
let renderer: THREE.WebGLRenderer
// scene.add(new THREE.AmbientLight(0xcc_cc_cc))
// scene.add(new THREE.DirectionalLight(0xff_ff_ff, 0.5))
scene.add(camera)
scene.background = new THREE.Color('lightblue')
scene.matrixAutoUpdate = false
scene.add(new THREE.AmbientLight(0xcc_cc_cc))
scene.add(new THREE.DirectionalLight(0xff_ff_ff, 0.5))

THREE.ColorManagement.enabled = false

let sections = new Map<string, THREE.Mesh>()
globalThis.sections = sections
globalThis.camera = camera
globalThis.scene = scene
globalThis.marks = {}

let fps = 0
let processedSinceLastRender = 0
setInterval(() => {
    // console.log('FPS', fps)
    globalThis.fps = fps
    globalThis.worstFps = Math.min(globalThis.worstFps ?? Infinity, fps)
    fps = 0
}, 1000)
setInterval(() => {
    globalThis.worstFps = Infinity
}, 10000)
const render = () => {
    tweenJs.update()
    renderer.render(scene, camera)
    globalThis.maxProcessed = Math.max(globalThis.maxProcessed ?? 0, processedSinceLastRender)
    processedSinceLastRender = 0
    fps++
}

export const threeJsWorkerProxyType = createWorkerProxy({
    async canvas (canvas: OffscreenCanvas, textureBlob: Blob) {
        const textureBitmap = await createImageBitmap(textureBlob)
        const texture = new THREE.CanvasTexture(textureBitmap)
        texture.magFilter = THREE.NearestFilter
        texture.minFilter = THREE.NearestFilter
        texture.flipY = false
        texture.needsUpdate = true
        material = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, alphaTest: 0.1, map: texture })

        renderer = new THREE.WebGLRenderer({ canvas })
        renderer.outputColorSpace = THREE.LinearSRGBColorSpace
        camera.aspect = canvas.width / canvas.height
        camera.updateProjectionMatrix()

        renderer.setAnimationLoop(render)
    },
    addGeometry (position: { x, y, z }, geometry?: { positions, normals, uvs, colors, indices }) {
        const key = `${position.x},${position.y},${position.z}`
        if (sections.has(key)) {
            const section = sections.get(key)!
            section.geometry.dispose()
            scene.remove(section)
            sections.delete(key)
        }
        if (!geometry) return
        const bufferGeometry = new THREE.BufferGeometry()
        bufferGeometry.setAttribute('position', new THREE.BufferAttribute(geometry.positions, 3))
        bufferGeometry.setAttribute('normal', new THREE.BufferAttribute(geometry.normals, 3))
        bufferGeometry.setAttribute('uv', new THREE.BufferAttribute(geometry.uvs, 2))
        bufferGeometry.setAttribute('color', new THREE.BufferAttribute(geometry.colors, 3))
        bufferGeometry.setIndex(geometry.indices)
        const mesh = new THREE.Mesh(bufferGeometry, material)
        // mesh.frustumCulled = false
        const old = mesh.geometry.computeBoundingSphere
        mesh.geometry.computeBoundingSphere = function () {
            let start = performance.now()
            // old.call(mesh.geometry)
            globalThis.marks.computeBoundingSphere ??= 0
            globalThis.marks.computeBoundingSphere += performance.now() - start
            mesh.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 16)
        }
        mesh.position.set(position.x, position.y, position.z)
        scene.add(mesh)
        processedSinceLastRender++
        if (processedSinceLastRender > 5) {
            render()
        }
    },
    updateCamera (position: { x, y, z }, rotation: { x, y, z }) {
        // camera.position.set(position.x, position.y, position.z)
        new tweenJs.Tween(camera.position).to({ x: position.x, y: position.y, z: position.z }, 50).start()
        camera.rotation.set(rotation.x, rotation.y, rotation.z, 'ZYX')
    }
})
