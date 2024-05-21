/// <reference types="@webgpu/types" />
import * as THREE from 'three'
import { BlockFaceType, BlockType } from './shared'
import * as tweenJs from '@tweenjs/tween.js'
import { cubePositionOffset, cubeUVOffset, cubeVertexArray, cubeVertexCount, cubeVertexSize } from './cube'
//@ts-ignore
import VertShader from './Cube.vert.wgsl'
//@ts-ignore
import FragShader from './Cube.frag.wgsl'

let allSides = [] as ([number, number, number, BlockFaceType] | undefined)[]
let allSidesAdded = 0
let needsSidesUpdate = false

let chunksArrIndexes = {}
let freeArrayIndexes = [] as [number, number][]
let rendering = true
let sidePositions
let updateCubes: (startIndex: any, forceUpdate?) => void
let lastNotUpdatedIndex
let lastNotUpdatedArrSize
let animationTick = 0

const updateCubesWhenAvailable = (pos) => {
    if (updateCubes) {
        updateCubes(pos)
    } else {
        setTimeout(updateCubesWhenAvailable, 100)
    }
}

const camera = new THREE.PerspectiveCamera(75, 1 / 1, 0.1, 1000)
globalThis.camera = camera

let renderedFrames = 0
setInterval(() => {
    // console.log('FPS:', renderedFrames)
    postMessage({ type: 'fps', fps: renderedFrames })
    renderedFrames = 0
}, 1000)

const updateSize = (width, height) => {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
}


class WebgpuRendererWorker {
    device: GPUDevice
    renderPassDescriptor: GPURenderPassDescriptor
    uniformBindGroup: GPUBindGroup
    UniformBuffer: GPUBuffer
    ViewUniformBuffer: GPUBuffer
    ProjectionUniformBuffer: GPUBuffer
    ctx: GPUCanvasContext
    verticesBuffer: GPUBuffer
    InstancedModelBuffer: GPUBuffer
    pipeline: GPURenderPipeline

    constructor(public canvas: HTMLCanvasElement, public imageBlob: ImageBitmapSource, public isPlayground: boolean, public FragShaderOverride?) {
        this.init()
    }

    async init () {
        const { canvas, imageBlob, isPlayground, FragShaderOverride } = this

        updateSize(canvas.width, canvas.height)
        // export const initWebglRenderer = async (canvas: HTMLCanvasElement, imageBlob: ImageBitmapSource, isPlayground: boolean, FragShaderOverride?) => {
        // isPlayground = false
        // blockStates = blockStatesJson
        const textureBitmap = await createImageBitmap(imageBlob)
        const textureWidth = textureBitmap.width
        const textureHeight = textureBitmap.height

        const adapter = await navigator.gpu.requestAdapter()
        this.device = await adapter.requestDevice()
        const { device } = this

        const ctx = this.ctx = canvas.getContext('webgpu')!

        const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

        ctx.configure({
            device,
            format: presentationFormat,
            alphaMode: 'premultiplied',
        })

        const verticesBuffer = device.createBuffer({
            size: cubeVertexArray.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        })
        this.verticesBuffer = verticesBuffer
        new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray)
        verticesBuffer.unmap()
        let ModelMatrix = new THREE.Matrix4()

        const InstancedModelBuffer = device.createBuffer({
            size: 4 * 4 * 4,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        })
        this.InstancedModelBuffer = InstancedModelBuffer
        new Float32Array(InstancedModelBuffer.getMappedRange()).set(ModelMatrix.elements)
        InstancedModelBuffer.unmap()
        //device.StepM
        const vertexCode = VertShader
        const fragmentCode = FragShader

        const pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: device.createShaderModule({
                    code: vertexCode,
                }),
                buffers: [
                    {
                        arrayStride: cubeVertexSize,
                        attributes: [
                            {
                                // position
                                shaderLocation: 0,
                                offset: cubePositionOffset,
                                format: 'float32x4',
                            },
                            {
                                // uv
                                shaderLocation: 1,
                                offset: cubeUVOffset,
                                format: 'float32x2',
                            },
                        ],
                    },
                    {
                        arrayStride: 4 * 4 * 4,
                        attributes: [
                            {
                                // ModelMatrix
                                shaderLocation: 2,
                                offset: 0,
                                format: 'float32x4',
                            }
                        ],
                        stepMode: 'instance',
                    }
                ],
            },
            fragment: {
                module: device.createShaderModule({
                    code: fragmentCode,
                }),
                targets: [
                    {
                        format: presentationFormat,
                        blend: {
                            color: {
                                srcFactor: 'src-alpha',
                                dstFactor: 'one-minus-src-alpha',
                                operation: 'add',
                            },
                            alpha: {
                                srcFactor: 'src-alpha',
                                dstFactor: 'one-minus-src-alpha',
                                operation: 'add',
                            }
                        },
                    },
                ],
            },
            primitive: {
                topology: 'triangle-list',
                //cullMode: 'back',

            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus',
            },

        })
        this.pipeline = pipeline

        const depthTexture = device.createTexture({
            size: [canvas.width, canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        })

        const uniformBufferSize = 4 * (4 * 4) // 4x4 matrix
        this.UniformBuffer = device.createBuffer({
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        // Fetch the image and upload it into a GPUTexture.
        let cubeTexture: GPUTexture
        {
            cubeTexture = device.createTexture({
                size: [textureBitmap.width, textureBitmap.height, 1],
                format: 'rgba8unorm',
                usage:
                    GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.RENDER_ATTACHMENT,
            })
            device.queue.copyExternalImageToTexture(
                { source: textureBitmap },
                { texture: cubeTexture },
                [textureBitmap.width, textureBitmap.height]
            )
        }

        const sampler = device.createSampler({
            magFilter: 'nearest',
            minFilter: 'nearest',
        })

        this.uniformBindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.UniformBuffer,
                    },
                },
                {
                    binding: 1,
                    resource: sampler,
                },
                {
                    binding: 2,
                    resource: cubeTexture.createView(),
                },
            ],
        })

        this.renderPassDescriptor = {
            colorAttachments: [
                {
                    view: undefined, // Assigned later
                    clearValue: [0.5, 0.5, 0.5, 1.0],
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
            depthStencilAttachment: {
                view: depthTexture.createView(),

                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            },
        }

        this.loop()

        return canvas
    }


    lastCall = performance.now()
    logged = false
    loop () {
        if (!rendering) {
            requestAnimationFrame(() => this.loop())
            return
        }

        const { device, UniformBuffer: uniformBuffer, renderPassDescriptor, uniformBindGroup, pipeline, ctx, verticesBuffer } = this

        const now = Date.now()
        tweenJs.update()

        const modelViewProjectionMat4 = new THREE.Matrix4()
        camera.updateMatrix()
        const projectionMatrix = camera.projectionMatrix
        modelViewProjectionMat4.multiplyMatrices(projectionMatrix, camera.matrix.invert())
        const modelViewProjection = new Float32Array(modelViewProjectionMat4.elements)
        // globalThis.modelViewProjection = modelViewProjection
        device.queue.writeBuffer(
            uniformBuffer,
            0,
            modelViewProjection.buffer,
            modelViewProjection.byteOffset,
            modelViewProjection.byteLength
        )
        renderPassDescriptor.colorAttachments[0].view = ctx
            .getCurrentTexture()
            .createView()

        const commandEncoder = device.createCommandEncoder()
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)

        passEncoder.setPipeline(pipeline)
        passEncoder.setBindGroup(0, uniformBindGroup)
        passEncoder.setVertexBuffer(0, verticesBuffer)
        passEncoder.setVertexBuffer(1, this.InstancedModelBuffer)
        passEncoder.draw(cubeVertexCount, 1)

        passEncoder.end()
        device.queue.submit([commandEncoder.finish()])

        renderedFrames++
        if (rendering) {
            // this.loop()
            setTimeout(() => this.loop())
            // requestAnimationFrame(() => this.loop())
        }
    }
}

let fullReset

let webglRendererWorker: WebgpuRendererWorker | undefined


let started = false
let newWidth: number | undefined
let newHeight: number | undefined
let autoTickUpdate = undefined as number | undefined
onmessage = function (e) {
    if (!started) {
        started = true
        webglRendererWorker = new WebgpuRendererWorker(e.data.canvas, e.data.imageBlob, e.data.isPlayground, e.data.FragShaderOverride)
        return
    }
    if (e.data.type === 'startRender') {
        rendering = true
    }
    if (e.data.type === 'stopRender') {
        rendering = false
    }
    if (e.data.type === 'resize') {
        newWidth = e.data.newWidth
        newHeight = e.data.newHeight

        updateSize(newWidth, newHeight)
    }
    if (e.data.type === 'addBlocksSection') {
        const currentLength = allSides.length
        // in: object - name, out: [x, y, z, name]
        const newData = Object.entries(e.data.data.blocks).flatMap(([key, value]) => {
            const [x, y, z] = key.split(',').map(Number)
            const block = value as BlockType
            return block.sides.map((side) => {
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

        chunksArrIndexes[e.data.key] = [currentLength, currentLength + newData.length]
        allSides.push(...newData)
        lastNotUpdatedIndex ??= currentLength
        // updateCubes?.(currentLength)
    }
    if (e.data.type === 'addBlocksSectionDone') {
        updateCubesWhenAvailable(lastNotUpdatedIndex)
        lastNotUpdatedIndex = undefined
        lastNotUpdatedArrSize = undefined
    }
    if (e.data.type === 'removeBlocksSection') {
        // fill data with 0
        const [startIndex, endIndex] = chunksArrIndexes[e.data.key]
        for (let i = startIndex; i < endIndex; i++) {
            allSides[i] = undefined
        }
        lastNotUpdatedArrSize = endIndex - startIndex
        updateCubes(startIndex)

        // freeArrayIndexes.push([startIndex, endIndex])

        // // merge freeArrayIndexes TODO
        // if (freeArrayIndexes.at(-1)[0] === freeArrayIndexes.at(-2)?.[1]) {
        //     const [startIndex, endIndex] = freeArrayIndexes.pop()!
        //     const [startIndex2, endIndex2] = freeArrayIndexes.pop()!
        //     freeArrayIndexes.push([startIndex2, endIndex])
        // }
    }
    if (e.data.type === 'camera') {
        camera.rotation.set(e.data.camera.rotation.x, e.data.camera.rotation.y, e.data.camera.rotation.z, 'ZYX')
        // camera.position.set(e.data.camera.position.x, e.data.camera.position.y, e.data.camera.position.z)
        if (camera.position.x === 0 && camera.position.y === 0 && camera.position.z === 0) {
            // initial camera position
            camera.position.set(e.data.camera.position.x, e.data.camera.position.y, e.data.camera.position.z)
        } else {
            new tweenJs.Tween(camera.position).to({ x: e.data.camera.position.x, y: e.data.camera.position.y, z: e.data.camera.position.z }, 50).start()
        }
    }
    if (e.data.type === 'animationTick') {
        if (e.data.frames <= 0) {
            autoTickUpdate = undefined
            animationTick = 0
            return
        }
        if (e.data.tick === -1) {
            autoTickUpdate = e.data.frames
        } else {
            autoTickUpdate = undefined
            animationTick = e.data.tick % 20 // todo update automatically in worker
        }
    }
    if (e.data.type === 'fullReset') {
        fullReset()
    }
    if (e.data.type === 'exportData') {
        const exported = exportData()
        postMessage({ type: 'exportData', data: exported }, undefined, [exported.sides.buffer])
    }
    if (e.data.type === 'loadFixture') {
        // allSides = e.data.json.map(([x, y, z, face, textureIndex]) => {
        //     return [x, y, z, { face, textureIndex }] as [number, number, number, BlockFaceType]
        // })
        const dataSize = e.data.json.length / 5
        for (let i = 0; i < e.data.json.length; i += 5) {
            allSides.push([e.data.json[i], e.data.json[i + 1], e.data.json[i + 2], { face: e.data.json[i + 3], textureIndex: e.data.json[i + 4] }])
        }
        updateCubesWhenAvailable(0)
    }
}

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
        const [x, y, z, side] = allSides[i]
        flatData.set([x, y, z, side.face, side.textureIndex], i * 5)
    }

    return { sides: flatData }
}

setInterval(() => {
    if (autoTickUpdate) {
        animationTick = (animationTick + 1) % autoTickUpdate
    }
}, 1000 / 20)
