import * as THREE from 'three'
import * as tweenJs from '@tweenjs/tween.js'
import { BlockFaceType } from './shared'
import { cubePositionOffset, cubeUVOffset, cubeVertexArray, cubeVertexCount, cubeVertexSize } from './CubeDef'
import VertShader from './Cube.vert.wgsl'
import FragShader from './Cube.frag.wgsl'
import ComputeShader from './Cube.comp.wgsl'
import ComputeSortShader from './CubeSort.comp.wgsl'
import { chunksStorage, updateSize } from './webgpuRendererWorker'
import { defaultWebgpuRendererParams, RendererParams } from './webgpuRendererShared'

export class WebgpuRenderer {
  rendering = true
  renderedFrames = 0
  rendererParams = { ...defaultWebgpuRendererParams }

  ready = false

  device: GPUDevice
  renderPassDescriptor: GPURenderPassDescriptor
  uniformBindGroup: GPUBindGroup
  vertexCubeBindGroup: GPUBindGroup
  cameraUniform: GPUBuffer
  ViewUniformBuffer: GPUBuffer
  ProjectionUniformBuffer: GPUBuffer
  ctx: GPUCanvasContext
  verticesBuffer: GPUBuffer
  InstancedModelBuffer: GPUBuffer
  pipeline: GPURenderPipeline
  InstancedTextureIndexBuffer: GPUBuffer
  InstancedColorBuffer: GPUBuffer
  notRenderedAdditions = 0

  // Add these properties to the WebgpuRenderer class
  computePipeline: GPUComputePipeline
  indirectDrawBuffer: GPUBuffer
  cubesBuffer: GPUBuffer
  visibleCubesBuffer: GPUBuffer
  computeBindGroup: GPUBindGroup
  computeBindGroupLayout: GPUBindGroupLayout
  indirectDrawParams: Uint32Array
  maxBufferSize: number
  commandEncoder: GPUCommandEncoder
  AtlasTexture: GPUTexture
  secondCameraUiformBindGroup: GPUBindGroup
  secondCameraUniform: GPUBuffer

  multisampleTexture: GPUTexture | undefined
  chunksBuffer: GPUBuffer
  chunkBindGroup: GPUBindGroup
  debugBuffer: GPUBuffer

  actualBufferSize = 0
  occlusionTexture: GPUTexture
  computeSortPipeline: GPUComputePipeline
  occlusionTextureIndex: GPUTexture
  
  constructor (public canvas: HTMLCanvasElement, public imageBlob: ImageBitmapSource, public isPlayground: boolean, public camera: THREE.PerspectiveCamera, public localStorage: any, public NUMBER_OF_CUBES: number) {
    this.NUMBER_OF_CUBES = 1
    this.init()
  }

  changeBackgroundColor (color: [number, number, number]) {
    const colorRgba = [color[0], color[1], color[2], 1]
    this.renderPassDescriptor.colorAttachments[0].clearValue = colorRgba
  }

  updateConfig (newParams: RendererParams) {
    this.rendererParams = { ...this.rendererParams, ...newParams }
  }

  async init () {
    const { canvas, imageBlob, isPlayground, localStorage } = this

    updateSize(canvas.width, canvas.height)
    const textureBitmap = await createImageBitmap(imageBlob)
    const textureWidth = textureBitmap.width
    const textureHeight = textureBitmap.height

    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) throw new Error('WebGPU not supported')
    this.device = await adapter.requestDevice()
    const { device } = this
    this.maxBufferSize = device.limits.maxStorageBufferBindingSize
    this.renderedFrames = device.limits.maxComputeWorkgroupSizeX
    console.log('max buffer size', this.maxBufferSize / 1024 / 1024, 'MB')

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

    const pipeline = device.createRenderPipeline({
      label: 'mainPipeline',
      layout: 'auto',
      vertex: {
        module: device.createShaderModule({
          code: localStorage.vertShader || VertShader,
        }),
        buffers: [
          {
            arrayStride: cubeVertexSize,
            attributes: [
              {
                shaderLocation: 0,
                offset: cubePositionOffset,
                format: 'float32x3',
              },
              {
                shaderLocation: 1,
                offset: cubeUVOffset,
                format: 'float32x2',
              },
            ],
          },
        ],
      },
      fragment: {
        module: device.createShaderModule({
          code: localStorage.fragShader || FragShader,
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
              },
            },
          },
        ],
      },
      // multisample: {
      //   count: 4,
      // },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'front',
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
      //sampleCount: 4,
    })

    const uniformBufferSize = 4 * (4 * 4) // 4x4 matrix
    this.cameraUniform = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    this.secondCameraUniform = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    const ViewProjectionMat42 = new THREE.Matrix4()
    const { projectionMatrix: projectionMatrix2, matrix: matrix2 } = this.camera2
    ViewProjectionMat42.multiplyMatrices(projectionMatrix2, matrix2.invert())
    const ViewProjection2 = new Float32Array(ViewProjectionMat42.elements)
    device.queue.writeBuffer(
      this.secondCameraUniform,
      0,
      ViewProjection2
    )

    // Fetch the image and upload it into a GPUTexture.

    this.AtlasTexture = device.createTexture({
      size: [textureBitmap.width, textureBitmap.height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      //sampleCount: 4
    })
    device.queue.copyExternalImageToTexture(
      { source: textureBitmap },
      { texture: this.AtlasTexture },
      [textureBitmap.width, textureBitmap.height]
    )


    this.renderPassDescriptor = {
      label: 'MainRenderPassDescriptor',
      colorAttachments: [
        {
          view: undefined as any, // Assigned later
          clearValue: [0.678_431_372_549_019_6, 0.847_058_823_529_411_8, 0.901_960_784_313_725_5, 1],
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    }

    // Create compute pipeline
    const computeShaderModule = device.createShaderModule({
      code: localStorage.computeShader || ComputeShader,
      label: 'Occlusion Writing',
    })

    const computeSortShaderModule = device.createShaderModule({
      code: ComputeSortShader,
      label: 'Storage Texture Sorting',
    })

    const computeBindGroupLayout = device.createBindGroupLayout({
      label: 'computeBindGroupLayout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
    })

    const computeChunksLayout = device.createBindGroupLayout({
      label: 'computeChunksLayout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'read-write', format: 'r32uint', viewDimension: '2d' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'read-write', format: 'r32uint', viewDimension: '2d' } },
      ],
    })


    const computePipelineLayout = device.createPipelineLayout({
      label: 'computePipelineLayout',
      bindGroupLayouts: [computeBindGroupLayout, computeChunksLayout]

    })

    this.computePipeline = device.createComputePipeline({
      label: 'Culled Instance',
      layout: computePipelineLayout,
      // layout: 'auto',
      compute: {
        module: computeShaderModule,
        entryPoint: 'main',
      },
    })

    this.computeSortPipeline = device.createComputePipeline({
      label: 'Culled Instance',
      layout: computePipelineLayout,
      // layout: 'auto',
      compute: {
        module: computeSortShaderModule,
        entryPoint: 'main',
      },
    })

    

    this.indirectDrawBuffer = device.createBuffer({
      label: 'indirectDrawBuffer',
      size: 16, // 4 uint32 values
      usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    this.debugBuffer = device.createBuffer({
      label: 'debugBuffer',
      size: 4 * 8192,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    })

    // Initialize indirect draw parameters
    const indirectDrawParams = new Uint32Array([cubeVertexCount, 0, 0, 0])
    device.queue.writeBuffer(this.indirectDrawBuffer, 0, indirectDrawParams)

    this.createNewDataBuffers()


    this.indirectDrawParams = new Uint32Array([cubeVertexCount, 0, 0, 0])

    // always last!
    this.loop(true) // start rendering
    this.ready = true
    return canvas
  }

  private createUniformBindGroup (device: GPUDevice, pipeline: GPURenderPipeline) {
    const sampler = device.createSampler({
      magFilter: 'nearest',
      minFilter: 'nearest',
    })

    this.uniformBindGroup = device.createBindGroup({
      label: 'uniformBindGroups',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.cameraUniform,
          },
        },
        {
          binding: 1,
          resource: sampler,
        },
        {
          binding: 2,
          resource: this.AtlasTexture.createView(),
        },
        // {
        //   binding: 3,
        //   resource: {
        //     buffer: this.visibleCubesBuffer
        //   }
        // }
      ],
    })

    this.vertexCubeBindGroup = device.createBindGroup({
      label: 'vertexCubeBindGroup',
      layout: pipeline.getBindGroupLayout(1),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.cubesBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.visibleCubesBuffer },
        },
        {
          binding: 2,
          resource: { buffer: this.chunksBuffer },
        }
      ],
    })

    this.secondCameraUiformBindGroup = device.createBindGroup({
      label: 'uniformBindGroupsCamera',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.secondCameraUniform,
          },
        },
        {
          binding: 1,
          resource: sampler,
        },
        {
          binding: 2,
          resource: this.AtlasTexture.createView(),
        },
      ],
    })


    this.computeBindGroup = device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      label: 'computeBindGroup',
      entries: [
        {
          binding: 0,
          resource: { buffer: this.cameraUniform },
        },
        {
          binding: 1,
          resource: { buffer: this.cubesBuffer },
        },
        {
          binding: 2,
          resource: { buffer: this.visibleCubesBuffer },
        },
        {
          binding: 3,
          resource: { buffer: this.indirectDrawBuffer },
        },
        {
          binding: 4,
          resource: { buffer: this.debugBuffer },
        }
      ],
    })

    this.chunkBindGroup = device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(1),
      label: 'computeBindGroup',
      entries: [
        {
          binding: 0,
          resource: { buffer: this.chunksBuffer },
        },
        {
          binding: 1,
          resource: this.occlusionTexture.createView(),
        },
        {
          binding: 2,
          resource: this.occlusionTextureIndex.createView(),
        },
        
      ],
    })
  }

  async readDebugBuffer () {
    const readBuffer = this.device.createBuffer({
      size: this.debugBuffer.size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })

    const commandEncoder = this.device.createCommandEncoder()
    commandEncoder.copyBufferToBuffer(this.debugBuffer, 0, readBuffer, 0, this.debugBuffer.size)
    this.device.queue.submit([commandEncoder.finish()])

    await readBuffer.mapAsync(GPUMapMode.READ)
    const arrayBuffer = readBuffer.getMappedRange()
    const debugData = new Uint32Array(arrayBuffer.slice(0, this.debugBuffer.size))
    readBuffer.unmap()
    readBuffer.destroy()
    return debugData
  }



  createNewDataBuffers () {
    const oldCubesBuffer = this.cubesBuffer
    const oldVisibleCubesBuffer = this.visibleCubesBuffer

    // Create buffers for compute shader and indirect drawing
    this.cubesBuffer = this.device.createBuffer({
      label: 'cubesBuffer',
      size: this.NUMBER_OF_CUBES * 8, // 8 floats per cube - minimum buffer size
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    })

    this.chunksBuffer = this.device.createBuffer({
      label: 'chunksBuffer',
      size: 65_535 * 12, // 8 floats per cube - minimum buffer size
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    })

    this.occlusionTexture = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: 'r32uint',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    })

    this.occlusionTextureIndex = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: 'r32uint',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    })



    this.visibleCubesBuffer = this.device.createBuffer({
      label: 'visibleCubesBuffer',
      size: this.NUMBER_OF_CUBES * 8,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    })

    if (oldCubesBuffer) {
      this.commandEncoder.copyBufferToBuffer(oldCubesBuffer, 0, this.cubesBuffer, 0, this.realNumberOfCubes * 8)
    }

    this.createUniformBindGroup(this.device, this.pipeline)
  }

  removeOne () { }

  realNumberOfCubes = 0
  waitingNextUpdateSidesOffset = undefined as undefined | number

  updateSides (startOffset = 0) {
    if (this.waitingNextUpdateSidesOffset !== undefined && startOffset >= this.waitingNextUpdateSidesOffset) return
    console.log('updating', startOffset, !!this.waitingNextUpdateSidesOffset)
    this.waitingNextUpdateSidesOffset = startOffset
  }

  updateCubesBuffersDataFromLoop () {
    if (this.waitingNextUpdateSidesOffset === undefined) return
    const startOffset = this.waitingNextUpdateSidesOffset
    console.time('updateSides')
    const positions = [] as number[]
    const textureIndexes = [] as number[]
    const colors = [] as number[]
    const { allSides, chunkSides } = chunksStorage.getDataForBuffers()
    for (const sides of allSides) {
      for (const side of sides) {
        if (!side) continue
        const [x, y, z] = side
        positions.push(x, y, z)
        const face = side[3]
        textureIndexes.push(face.textureIndex)
        const tint = face.tint ?? [1, 1, 1]
        colors.push(...tint.map(x => x * 255))
      }
    }

    const actualCount = Math.ceil(positions.length / 3)
    const NUMBER_OF_CUBES_NEEDED = actualCount
    if (NUMBER_OF_CUBES_NEEDED > this.NUMBER_OF_CUBES) {
      console.warn('extending number of cubes', NUMBER_OF_CUBES_NEEDED, this.NUMBER_OF_CUBES)
      this.NUMBER_OF_CUBES = NUMBER_OF_CUBES_NEEDED

      console.time('recreate buffers')
      this.createNewDataBuffers()
      console.timeEnd('recreate buffers')
    }
    this.realNumberOfCubes = NUMBER_OF_CUBES_NEEDED

    const BYTES_PER_ELEMENT = 2
    const cubeFlatData = new Uint32Array(this.NUMBER_OF_CUBES * 2)
    for (let i = 0; i < actualCount; i++) {
      const offset = i * 2
      const first = (((textureIndexes[i] << 4) | positions[i * 3 + 2]) << 9 | positions[i * 3 + 1]) << 4 | positions[i * 3]
      //const first = (textureIndexes[i] << 17) | (positions[i * 3 + 2] << 13) | (positions[i * 3 + 1] << 4) | positions[i * 3]
      const second = ((colors[i * 3 + 2]) << 8 | colors[i * 3 + 1]) << 8 | colors[i * 3]
      cubeFlatData[offset] = first
      cubeFlatData[offset + 1] = second
    }
    const chunksCount = chunkSides.size
    const chunksKeys = [...chunkSides.keys()]
    const chunksBuffer = new Int32Array(chunksCount * 3)
    let totalFromChunks = 0
    for (let i = 0; i < chunksCount; i++) {
      const offset = i * 3
      const chunkKey = chunksKeys[i]
      const [x, y, z] = chunkKey.split(',').map(Number)
      chunksBuffer[offset] = x
      chunksBuffer[offset + 1] = z
      const cubesCount = chunkSides.get(chunkKey)!.length
      chunksBuffer[offset + 2] = cubesCount
      totalFromChunks += cubesCount
    }
    if (totalFromChunks !== actualCount) {
      reportError?.(new Error(`Buffers length mismatch: chunks: ${totalFromChunks}, flat data: ${actualCount}`))
    }

    this.device.queue.writeBuffer(this.cubesBuffer, 0, cubeFlatData)
    this.device.queue.writeBuffer(this.chunksBuffer, 0, chunksBuffer)

    // Object.defineProperty(window, 'getBufferBlocksPositions', {
    //   get () {
    //     let minX = 0
    //     let minZ = 0
    //     let maxX = 0
    //     let maxZ = 0
    //     for (let i = 0; i < positions.length; i += 3) {
    //       const x = positions[i]
    //       const z = positions[i + 2]
    //       minX = Math.min(minX, x)
    //       minZ = Math.min(minZ, z)
    //       maxX = Math.max(maxX, x)
    //       maxZ = Math.max(maxZ, z)
    //     }
    //     console.log({ minX, minZ, maxX, maxZ })
    //     let str = ''
    //     for (let x = -minX; x <= maxX; x++) {
    //       for (let z = -minZ; z <= maxZ; z++) {
    //         const hasBlock = allSides.some(side => side && side[0] === x && side[2] === z)
    //         str += hasBlock ? 'X' : ' '
    //       }
    //       str += '\n'
    //     }
    //     return str
    //   },
    // })

    this.notRenderedAdditions++
    console.timeEnd('updateSides')
    this.waitingNextUpdateSidesOffset = undefined
    this.realNumberOfCubes = this.NUMBER_OF_CUBES
  }

  lastCall = performance.now()
  logged = false
  camera2 = (() => {
    const camera = new THREE.PerspectiveCamera()
    camera.lookAt(0, -1, 0)
    camera.position.set(150, 500, 150)
    camera.fov = 100
    //camera.rotation.set(0, 0, 0)
    camera.updateMatrix()
    return camera
  })()

  // debugBlockPositions() {}


  loop (forceFrame = false) {
    if (!this.rendering) {
      requestAnimationFrame(() => this.loop())
      if (!forceFrame) {
        return
      }
    }
    const start = performance.now()

    const { device, cameraUniform: uniformBuffer, renderPassDescriptor, uniformBindGroup, pipeline, ctx, verticesBuffer } = this

    const now = Date.now()
    tweenJs.update()

    const ViewProjectionMat4 = new THREE.Matrix4()
    this.camera.updateMatrix()
    const { projectionMatrix, matrix } = this.camera
    ViewProjectionMat4.multiplyMatrices(projectionMatrix, matrix.invert())
    const ViewProjection = new Float32Array(ViewProjectionMat4.elements)
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      ViewProjection
    )

    const canvasTexture = ctx.getCurrentTexture()
    // let { multisampleTexture } = this;
    // // If the multisample texture doesn't exist or
    // // is the wrong size then make a new one.
    // if (multisampleTexture === undefined ||
    //     multisampleTexture.width !== canvasTexture.width ||
    //     multisampleTexture.height !== canvasTexture.height) {

    //   // If we have an existing multisample texture destroy it.
    //   if (multisampleTexture) {
    //     multisampleTexture.destroy()
    //   }

    //   // Create a new multisample texture that matches our
    //   // canvas's size
    //   multisampleTexture = device.createTexture({
    //     format: canvasTexture.format,
    //     usage: GPUTextureUsage.RENDER_ATTACHMENT,
    //     size: [canvasTexture.width, canvasTexture.height],
    //     sampleCount: 4,
    //   })
    //   this.multisampleTexture = multisampleTexture
    // }
    // device.queue.writeTexture({
    //   texture: this.occlusionTexture
    // },
    //   new Uint32Array([0, 0, 0, 1]),
    // {
    //   bytesPerRow: 4 * this.occlusionTexture.width,
    //   rowsPerImage: this.occlusionTexture.height
    // }, {
    //   width: this.occlusionTexture.width,
    //   height: this.occlusionTexture.height, depthOrArrayLayers: 1
    // })

    device.queue.writeBuffer(
      this.indirectDrawBuffer, 0, this.indirectDrawParams
    )

    renderPassDescriptor.colorAttachments[0].view = ctx
      .getCurrentTexture()
      .createView()

    //     renderPassDescriptor.colorAttachments[0].view =
    //     multisampleTexture.createView();
    // // Set the canvas texture as the texture to "resolve"
    // // the multisample texture to.
    //     renderPassDescriptor.colorAttachments[0].resolveTarget =
    //     canvasTexture.createView();


    this.commandEncoder = device.createCommandEncoder()
    //this.commandEncoder.clearBuffer(this.occlusionTexture)
    //this.commandEncoder.
    // Compute pass for occlusion culling
    this.commandEncoder.label = 'Main Comand Encoder'
    this.updateCubesBuffersDataFromLoop()
    if (this.realNumberOfCubes) {

      {
        const computePass = this.commandEncoder.beginComputePass()
        computePass.label = 'ComputePass'
        computePass.setPipeline(this.computePipeline)
        computePass.setBindGroup(0, this.computeBindGroup)
        computePass.setBindGroup(1, this.chunkBindGroup)
        computePass.dispatchWorkgroups(Math.ceil(this.NUMBER_OF_CUBES / 256))
        computePass.end()
        device.queue.submit([this.commandEncoder.finish()])
      }

      {
        this.commandEncoder = device.createCommandEncoder()
        const computePass = this.commandEncoder.beginComputePass()
        computePass.label = 'ComputeSortPass'
        //this.occlusionTexture.
        computePass.setPipeline(this.computeSortPipeline)
        computePass.setBindGroup(0, this.computeBindGroup)
        computePass.setBindGroup(1, this.chunkBindGroup)
        computePass.dispatchWorkgroups(Math.ceil(this.canvas.width / 16), Math.ceil(this.canvas.height / 16))
        computePass.end()
        device.queue.submit([this.commandEncoder.finish()])
      }
      this.commandEncoder = device.createCommandEncoder()
      //device.queue.submit([commandEncoder.finish()]);
      // Render pass
      //console.log(this.indirectDrawBuffer.getMappedRange());
      const renderPass = this.commandEncoder.beginRenderPass(this.renderPassDescriptor)
      renderPass.label = 'RenderPass'
      renderPass.setPipeline(pipeline)
      renderPass.setBindGroup(0, this.uniformBindGroup)
      renderPass.setVertexBuffer(0, verticesBuffer)
      renderPass.setBindGroup(1, this.vertexCubeBindGroup)

      // Use indirect drawing
      renderPass.drawIndirect(this.indirectDrawBuffer, 0)

      if (this.rendererParams.secondCamera) {
        renderPass.setBindGroup(0, this.secondCameraUiformBindGroup)
        renderPass.setViewport(this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2, this.canvas.height / 2, 0, 0)
        renderPass.drawIndirect(this.indirectDrawBuffer, 0)
      }
      renderPass.end()
    }

    device.queue.submit([this.commandEncoder.finish()])

    this.renderedFrames++
    requestAnimationFrame(() => this.loop())
    this.notRenderedAdditions = 0
    const took = performance.now() - start
    if (took > 100) {
      console.log('took', took)
    }
  }
}
