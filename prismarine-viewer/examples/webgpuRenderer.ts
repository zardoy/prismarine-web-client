import * as THREE from 'three'
import * as tweenJs from '@tweenjs/tween.js'
import VolumtetricFragShader from '../webgpuShaders/RadialBlur/frag.wgsl'
import VolumtetricVertShader from '../webgpuShaders/RadialBlur/vert.wgsl'
import { BlockFaceType } from './shared'
import { PositionOffset, UVOffset, cubeVertexSize, quadVertexArrayStrip, quadVertexCountStrip } from './CubeDef'
import VertShader from './Cube.vert.wgsl'
import FragShader from './Cube.frag.wgsl'
import ComputeShader from './Cube.comp.wgsl'
import ComputeSortShader from './CubeSort.comp.wgsl'
import { chunksStorage, updateSize, postMessage } from './webgpuRendererWorker'
import { defaultWebgpuRendererParams, RendererInitParams, RendererParams } from './webgpuRendererShared'
import type { BlocksModelData } from './webgpuBlockModels'

const cubeByteLength = 12
export class WebgpuRenderer {
  destroyed = false
  rendering = true
  renderedFrames = 0
  rendererParams = { ...defaultWebgpuRendererParams }
  chunksFadeAnimationController = new IndexedInOutAnimationController(() => {})

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
  notRenderedBlockChanges = 0
  renderingStats: undefined | { instanceCount: number }
  renderingStatsRequestTime: number | undefined

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
  secondCameraUniformBindGroup: GPUBindGroup
  secondCameraUniform: GPUBuffer

  multisampleTexture: GPUTexture | undefined
  chunksBuffer: GPUBuffer
  chunkBindGroup: GPUBindGroup
  debugBuffer: GPUBuffer

  realNumberOfCubes = 0
  occlusionTexture: GPUBuffer
  computeSortPipeline: GPUComputePipeline
  depthTextureBuffer: GPUBuffer
  textureSizeBuffer: any
  textureSizeBindGroup: GPUBindGroup
  modelsBuffer: GPUBuffer
  indirectDrawBufferMap: GPUBuffer
  indirectDrawBufferMapBeingUsed = false
  cameraComputePositionUniform: GPUBuffer
  NUMBER_OF_CUBES: number
  depthTexture: GPUTexture
  rendererDeviceString: string
  cameraUpdated = true
  lastCameraUpdateTime = 0
  noCameraUpdates = 0
  positiveCameraUpdates = false
  lastCameraUpdateDiff = undefined as undefined | {
    x: number
    y: number
    z: number
    time: number
  }
  debugCameraMove = {
    x: 0,
    y: 0,
    z: 0
  }
  renderMs = 0
  renderMsCount = 0
  volumetricPipeline: GPURenderPipeline
  VolumetricBindGroup: GPUBindGroup
  depthTextureAnother: GPUTexture
  volumetricRenderPassDescriptor: GPURenderPassDescriptor
  tempTexture: GPUTexture
  rotationsUniform: GPUBuffer
  earlyZRejectUniform: GPUBuffer
  tileSizeUniform: GPUBuffer
  clearColorBuffer: GPUBuffer
  chunksCount: number


  // eslint-disable-next-line max-params
  constructor (public canvas: HTMLCanvasElement, public imageBlob: ImageBitmapSource, public isPlayground: boolean, public camera: THREE.PerspectiveCamera, public localStorage: any, public blocksDataModel: Record<string, BlocksModelData>, public rendererInitParams: RendererInitParams) {
    this.NUMBER_OF_CUBES = 65_536
    void this.init().catch((err) => {
      console.error(err)
      postMessage({ type: 'rendererProblem', isContextLost: false, message: err.message })
    })
  }

  changeBackgroundColor (color: [number, number, number]) {
    const colorRgba = [color[0], color[1], color[2], 1]
    this.renderPassDescriptor.colorAttachments[0].clearValue = colorRgba
    this.device.queue.writeBuffer(
      this.clearColorBuffer,
      0,
      new Float32Array(colorRgba)
    )
  }

  updateConfig (newParams: RendererParams) {
    this.rendererParams = { ...this.rendererParams, ...newParams }
  }

  async init () {
    const { canvas, imageBlob, isPlayground, localStorage } = this
    this.camera.near = 0.05
    updateSize(canvas.width, canvas.height)

    if (!navigator.gpu) throw new Error('WebGPU not supported (probably can be enabled in settings)')
    const adapter = await navigator.gpu.requestAdapter({
      ...this.rendererInitParams
    })
    if (!adapter) throw new Error('WebGPU not supported')
    const adapterInfo = adapter.info ?? {} // todo fix ios
    this.rendererDeviceString = `${adapterInfo.vendor} ${adapterInfo.device} (${adapterInfo.architecture}) ${adapterInfo.description}`

    const twoGigs = 2_147_483_644
    try {
      this.device = await adapter.requestDevice({
        // https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/limits
        requiredLimits: {
          maxStorageBufferBindingSize: twoGigs,
          maxBufferSize: twoGigs,
        }
      })
    } catch (err) {
      this.device = await adapter.requestDevice()
    }
    const { device } = this
    this.maxBufferSize = device.limits.maxStorageBufferBindingSize
    this.renderedFrames = device.limits.maxComputeWorkgroupSizeX
    console.log('max buffer size', this.maxBufferSize / 1024 / 1024, 'MB', 'available features', [...device.features.values()])

    const ctx = this.ctx = canvas.getContext('webgpu')!

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat()!

    ctx.configure({
      device,
      format: presentationFormat,
      alphaMode: 'opaque',
    })

    const verticesBuffer = device.createBuffer({
      size: quadVertexArrayStrip.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    })

    this.verticesBuffer = verticesBuffer
    new Float32Array(verticesBuffer.getMappedRange()).set(quadVertexArrayStrip)
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
                offset: PositionOffset,
                format: 'float32x3',
              },
              {
                shaderLocation: 1,
                offset: UVOffset,
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
        topology: 'triangle-strip',
        cullMode: 'none',
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth32float',
      },
    })
    this.pipeline = pipeline

    this.volumetricPipeline = device.createRenderPipeline({
      label: 'volumtetricPipeline',
      layout: 'auto',
      vertex: {
        module: device.createShaderModule({
          code: localStorage.VolumtetricVertShader || VolumtetricVertShader,
        }),
        buffers: [
          {
            arrayStride: cubeVertexSize,
            attributes: [
              {
                shaderLocation: 0,
                offset: PositionOffset,
                format: 'float32x3',
              },
              {
                shaderLocation: 1,
                offset: UVOffset,
                format: 'float32x2',
              },
            ],
          },
        ],
      },
      fragment: {
        module: device.createShaderModule({
          code: localStorage.VolumtetricFragShader || VolumtetricFragShader,
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
      primitive: {
        topology: 'triangle-strip',
        cullMode: 'none',
      },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: 'less',
        format: 'depth32float',
      },
    })

    this.depthTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      format: 'depth32float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      //sampleCount: 4,
    })

    this.depthTextureAnother = device.createTexture({
      size: [canvas.width, canvas.height],
      format: 'depth32float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      //sampleCount: 4,
    })

    this.tempTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      format: presentationFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      //sampleCount: 4,
    })

    const Mat4x4BufferSize = 4 * (4 * 4) // 4x4 matrix

    this.cameraUniform = device.createBuffer({
      size: Mat4x4BufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    this.earlyZRejectUniform = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    this.tileSizeUniform = device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    this.rotationsUniform = device.createBuffer({
      size: Mat4x4BufferSize * 6,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    const matrixData = new Float32Array([
      ...new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(90)).toArray(),
      ...new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(-90)).toArray(),
      ...new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(0)).toArray(),
      ...new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(180)).toArray(),
      ...new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(-90)).toArray(),
      ...new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(90)).toArray(),
    ])

    device.queue.writeBuffer(
      this.rotationsUniform,
      0,
      matrixData
    )

    this.clearColorBuffer = device.createBuffer({
      size: 4 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    this.cameraComputePositionUniform = device.createBuffer({
      size: 4 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    this.secondCameraUniform = device.createBuffer({
      size: Mat4x4BufferSize,
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

    // upload image into a GPUTexture.
    await this.updateTexture(imageBlob, true)

    this.volumetricRenderPassDescriptor = {
      label: 'VolumteticRenderPassDescriptor',
      colorAttachments: [
        {
          view: undefined as any, // Assigned later
          clearValue: [0.678_431_372_549_019_6, 0.847_058_823_529_411_8, 0.901_960_784_313_725_5, 1],
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: this.depthTextureAnother.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    }

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
        view: this.depthTexture.createView(),
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
        { binding: 5, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'depth' } },
        { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    })

    const computeChunksLayout = device.createBindGroupLayout({
      label: 'computeChunksLayout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    })

    const textureSizeBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' },
        },
      ],
    })

    const computePipelineLayout = device.createPipelineLayout({
      label: 'computePipelineLayout',
      bindGroupLayouts: [computeBindGroupLayout, computeChunksLayout, textureSizeBindGroupLayout]
    })

    this.textureSizeBuffer = this.device.createBuffer({
      size: 8, // vec2<u32> consists of two 32-bit unsigned integers
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })


    this.textureSizeBindGroup = device.createBindGroup({
      layout: textureSizeBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.textureSizeBuffer,
          },
        },
      ],
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
      usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    })

    this.indirectDrawBufferMap = device.createBuffer({
      label: 'indirectDrawBufferMap',
      size: 16, // 4 uint32 values
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })

    this.debugBuffer = device.createBuffer({
      label: 'debugBuffer',
      size: 4 * 8192,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    })

    this.chunksBuffer = this.createVertexStorage(202_535 * 20, 'chunksBuffer')
    this.occlusionTexture = this.createVertexStorage(4096 * 4096 * 4, 'occlusionTexture')
    this.depthTextureBuffer = this.createVertexStorage(4096 * 4096 * 4, 'depthTextureBuffer')

    // Initialize indirect draw parameters

    // initialize texture size
    const textureSize = new Uint32Array([this.canvas.width, this.canvas.height])
    device.queue.writeBuffer(this.textureSizeBuffer, 0, textureSize)

    void device.lost.then((info) => {
      console.warn('WebGPU context lost:', info)
      postMessage({ type: 'rendererProblem', isContextLost: true, message: info.message })
    })

    this.updateBlocksModelData()
    this.createNewDataBuffers()

    this.indirectDrawParams = new Uint32Array([quadVertexCountStrip, 0, 0, 0])

    // always last!
    this.loop(true) // start rendering
    this.ready = true
    return canvas
  }

  async updateTexture (imageBlob: ImageBitmapSource, isInitial = false) {
    const textureBitmap = await createImageBitmap(imageBlob)
    this.AtlasTexture?.destroy()
    this.AtlasTexture = this.device.createTexture({
      size: [textureBitmap.width, textureBitmap.height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      //sampleCount: 4
    })
    this.device.queue.copyExternalImageToTexture(
      { source: textureBitmap },
      { texture: this.AtlasTexture },
      [textureBitmap.width, textureBitmap.height]
    )

    this.device.queue.writeBuffer(
      this.tileSizeUniform,
      0,
      new Float32Array([16, 16])
    )

    if (!isInitial) {
      this.createUniformBindGroup()
    }
  }

  safeLoop (isFirst: boolean | undefined, time: number | undefined) {
    try {
      this.loop(isFirst, time)
    } catch (err) {
      console.error(err)
      postMessage({ type: 'rendererProblem', isContextLost: false, message: err.message })
    }
  }

  public updateBlocksModelData () {
    const keys = Object.keys(this.blocksDataModel)
    // const modelsDataLength = keys.length
    const modelsDataLength = +keys.at(-1)!
    const modelsBuffer = new Uint32Array(modelsDataLength * 2)
    for (let i = 0; i < modelsDataLength; i++) {
      const blockData = this.blocksDataModel[i]/*  ?? {
        textures: [0, 0, 0, 0, 0, 0],
        rotation: [0, 0, 0, 0],
      } */
      if (!blockData) throw new Error(`Block model ${i} not found`)
      const tempBuffer1 = (((blockData.textures[0] << 10) | blockData.textures[1]) << 10) | blockData.textures[2]
      const tempBuffer2 = (((blockData.textures[3] << 10) | blockData.textures[4]) << 10) | blockData.textures[5]
      modelsBuffer[+i * 2] = tempBuffer1
      modelsBuffer[+i * 2 + 1] = tempBuffer2
    }

    this.modelsBuffer?.destroy()
    this.modelsBuffer = this.createVertexStorage(modelsDataLength * cubeByteLength, 'modelsBuffer')
    this.device.queue.writeBuffer(this.modelsBuffer, 0, modelsBuffer)
  }

  private createUniformBindGroup () {
    const { device, pipeline } = this
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
          resource:
          {
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
        {
          binding: 3,
          resource: {
            buffer: this.modelsBuffer
          },
        },
        {
          binding: 4,
          resource: {
            buffer: this.rotationsUniform
          }
        },
        {
          binding: 5,
          resource: { buffer: this.tileSizeUniform },
        }
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

    this.secondCameraUniformBindGroup = device.createBindGroup({
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
        {
          binding: 3,
          resource: {
            buffer: this.modelsBuffer
          },
        },
        {
          binding: 4,
          resource: {
            buffer: this.rotationsUniform
          }
        },
        {
          binding: 5,
          resource: { buffer: this.tileSizeUniform },
        }
      ],
    })

    this.VolumetricBindGroup = device.createBindGroup({
      layout: this.volumetricPipeline.getBindGroupLayout(0),
      label: 'volumtetricBindGroup',
      entries: [
        {
          binding: 0,
          resource: this.depthTexture.createView(),
        },
        {
          binding: 1,
          resource: sampler,
        },
        {
          binding: 2,
          resource: this.tempTexture.createView(),
        },
        {
          binding: 3,
          resource: { buffer: this.clearColorBuffer },
        }
      ]
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
        },
        {
          binding: 5,
          resource: this.depthTexture.createView(),
        },
        {
          binding: 6,
          resource: { buffer: this.earlyZRejectUniform },
        },
      ],
    })

    this.chunkBindGroup = device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(1),
      label: 'anotherComputeBindGroup',
      entries: [
        {
          binding: 0,
          resource: { buffer: this.chunksBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.occlusionTexture },
        },
        {
          binding: 2,
          resource: { buffer: this.depthTextureBuffer },
        },
        {
          binding: 3,
          resource: { buffer: this.cameraComputePositionUniform },
        }
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
    this.commandEncoder = this.device.createCommandEncoder()

    this.cubesBuffer = this.createVertexStorage(this.NUMBER_OF_CUBES * cubeByteLength, 'cubesBuffer')

    this.visibleCubesBuffer = this.createVertexStorage(this.NUMBER_OF_CUBES * cubeByteLength, 'visibleCubesBuffer')

    if (oldCubesBuffer) {
      this.commandEncoder.copyBufferToBuffer(oldCubesBuffer, 0, this.cubesBuffer, 0, oldCubesBuffer.size)
      this.commandEncoder.copyBufferToBuffer(oldVisibleCubesBuffer, 0, this.visibleCubesBuffer, 0, oldVisibleCubesBuffer.size)
      this.device.queue.submit([this.commandEncoder.finish()])
      oldCubesBuffer.destroy()
      oldVisibleCubesBuffer.destroy()

    }

    this.createUniformBindGroup()
  }

  private createVertexStorage (size: number, label: string) {
    return this.device.createBuffer({
      label,
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    })
  }

  updateSides () {
  }

  updateCubesBuffersDataFromLoop () {
    const DEBUG_DATA = false

    const dataForBuffers = chunksStorage.getDataForBuffers()
    if (!dataForBuffers) return
    const { allBlocks, chunks, awaitingUpdateSize: updateSize, awaitingUpdateStart: updateOffset } = dataForBuffers
    // console.log('updating', updateOffset, updateSize)

    const NUMBER_OF_CUBES_NEEDED = allBlocks.length
    if (NUMBER_OF_CUBES_NEEDED > this.NUMBER_OF_CUBES) {
      const NUMBER_OF_CUBES_OLD = this.NUMBER_OF_CUBES
      while (NUMBER_OF_CUBES_NEEDED > this.NUMBER_OF_CUBES) this.NUMBER_OF_CUBES += 1_000_000

      console.warn('extending number of cubes', NUMBER_OF_CUBES_OLD, '->', this.NUMBER_OF_CUBES, `(needed ${NUMBER_OF_CUBES_NEEDED})`)
      console.time('recreate buffers')
      this.createNewDataBuffers()
      console.timeEnd('recreate buffers')
    }
    this.realNumberOfCubes = NUMBER_OF_CUBES_NEEDED

    const unique = new Set()
    const debugCheckDuplicate = (first, second, third) => {
      const key = `${first},${third}`
      if (unique.has(key)) {
        throw new Error(`Duplicate: ${key}`)
      }
      unique.add(key)
    }

    const cubeFlatData = new Uint32Array(updateSize * 3)
    const blocksToUpdate = allBlocks.slice(updateOffset, updateOffset + updateSize)

    // eslint-disable-next-line unicorn/no-for-loop
    for (let i = 0; i < blocksToUpdate.length; i++) {
      let first = 0
      let second = 0
      let third = 0
      const chunkBlock = blocksToUpdate[i]

      if (chunkBlock) {
        const [x, y, z, block] = chunkBlock
        // if (chunk.index !== block.chunk) {
        //   throw new Error(`Block chunk mismatch ${block.chunk} !== ${chunk.index}`)
        // }
        const positions = [x, y + this.rendererParams.cameraOffset[1], z]
        const visibility = Array.from({ length: 6 }, (_, i) => (block.visibleFaces.includes(i) ? 1 : 0))
        const isTransparent = block.transparent

        const tint = block.tint ?? [1, 1, 1]
        const colors = tint.map(x => x * 255)

        first = ((block.modelId << 4 | positions[2]) << 10 | positions[1]) << 4 | positions[0]
        const visibilityCombined = (visibility[0]) |
          (visibility[1] << 1) |
          (visibility[2] << 2) |
          (visibility[3] << 3) |
          (visibility[4] << 4) |
          (visibility[5] << 5)
        second = ((visibilityCombined << 8 | colors[2]) << 8 | colors[1]) << 8 | colors[0]
        third = block.chunk!
      }

      cubeFlatData[i * 3] = first
      cubeFlatData[i * 3 + 1] = second
      cubeFlatData[i * 3 + 2] = third
      if (DEBUG_DATA && chunkBlock) {
        debugCheckDuplicate(first, second, third)
      }
    }

    const { totalFromChunks } = this.updateChunks(chunks)

    if (DEBUG_DATA) {
      const actualCount = allBlocks.length
      if (totalFromChunks !== actualCount) {
        reportError?.(new Error(`Buffers length mismatch: from chunks: ${totalFromChunks}, flat data: ${actualCount}`))
      }
    }

    this.device.queue.writeBuffer(this.cubesBuffer, updateOffset * cubeByteLength, cubeFlatData)

    this.notRenderedBlockChanges++
    this.realNumberOfCubes = allBlocks.length
  }

  updateChunks (chunks: Array<{ x: number, z: number, length: number }>, offset = 0) {
    this.chunksCount = chunks.length
    // this.commandEncoder = this.device.createCommandEncoder()
    // this.chunksBuffer = this.createVertexStorage(chunks.length * 20, 'chunksBuffer')
    // this.device.queue.submit([this.commandEncoder.finish()])
    const chunksBuffer = new Int32Array(this.chunksCount * 5)
    let totalFromChunks = 0
    for (let i = 0; i < this.chunksCount; i++) {
      const offset = i * 5
      const { x, z, length } = chunks[i]!
      const chunkProgress = this.chunksFadeAnimationController.indexes[i]?.progress ?? 1
      chunksBuffer[offset] = x
      chunksBuffer[offset + 1] = z
      chunksBuffer[offset + 2] = chunkProgress * 255
      chunksBuffer[offset + 3] = totalFromChunks
      chunksBuffer[offset + 4] = length
      const cubesCount = length
      totalFromChunks += cubesCount
    }
    this.device.queue.writeBuffer(this.chunksBuffer, offset, chunksBuffer)
    return { totalFromChunks }
  }

  lastCall = performance.now()
  logged = false
  camera2 = (() => {
    const camera = new THREE.PerspectiveCamera()
    camera.lookAt(0, -1, 0)
    camera.position.set(150, 500, 150)
    camera.fov = 100
    camera.updateMatrix()
    return camera
  })()

  lastLoopTime = performance.now()

  loop (forceFrame = false, time = performance.now()) {
    if (this.destroyed) return
    const nextFrame = () => {
      requestAnimationFrame((time) => {
        this.safeLoop(undefined, time)
      })
    }

    if (!this.rendering) {
      nextFrame()
      if (!forceFrame) {
        return
      }
    }
    const start = performance.now()
    const timeDiff = time - this.lastLoopTime
    this.loopPre(timeDiff)

    const { device, cameraUniform: uniformBuffer, renderPassDescriptor, uniformBindGroup, pipeline, ctx, verticesBuffer } = this

    this.chunksFadeAnimationController.update(time)
    // #region update camera
    tweenJs.update()
    const oldPos = this.camera.position.clone()
    this.camera.position.x += this.rendererParams.cameraOffset[0]
    this.camera.position.y += this.rendererParams.cameraOffset[1]
    this.camera.position.z += this.rendererParams.cameraOffset[2]

    this.camera.updateProjectionMatrix()
    this.camera.updateMatrix()

    const { projectionMatrix, matrix } = this.camera
    const ViewProjectionMat4 = new THREE.Matrix4()
    ViewProjectionMat4.multiplyMatrices(projectionMatrix, matrix.invert())
    const viewProjection = new Float32Array(ViewProjectionMat4.elements)
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      viewProjection
    )

    device.queue.writeBuffer(
      this.earlyZRejectUniform,
      0,
      new Uint32Array([this.rendererParams.earlyZRejection ? 1 : 0])
    )


    const cameraPosition = new Float32Array([this.camera.position.x, this.camera.position.y, this.camera.position.z])
    device.queue.writeBuffer(
      this.cameraComputePositionUniform,
      0,
      cameraPosition
    )

    this.camera.position.set(oldPos.x, oldPos.y, oldPos.z)
    // #endregion

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



    // TODO!
    if (this.rendererParams.godRays) {
      renderPassDescriptor.colorAttachments[0].view = this.tempTexture.createView()
      this.volumetricRenderPassDescriptor.colorAttachments[0].view = ctx
        .getCurrentTexture()
        .createView()
    } else {
      renderPassDescriptor.colorAttachments[0].view = ctx
        .getCurrentTexture()
        .createView()
    }


    //     renderPassDescriptor.colorAttachments[0].view =
    //     multisampleTexture.createView();
    // // Set the canvas texture as the texture to "resolve"
    // // the multisample texture to.
    //     renderPassDescriptor.colorAttachments[0].resolveTarget =
    //     canvasTexture.createView();


    this.commandEncoder = device.createCommandEncoder()
    //this.commandEncoder.clearBuffer(this.occlusionTexture)

    //this.commandEncoder.clearBuffer(this.DepthTextureBuffer);
    if (this.rendererParams.occlusionActive) {
      this.commandEncoder.clearBuffer(this.occlusionTexture)
      this.commandEncoder.clearBuffer(this.visibleCubesBuffer)
      this.commandEncoder.clearBuffer(this.depthTextureBuffer)
      device.queue.writeBuffer(this.indirectDrawBuffer, 0, this.indirectDrawParams)
    }
    // Compute pass for occlusion culling
    const textureSize = new Uint32Array([this.canvas.width, this.canvas.height])
    device.queue.writeBuffer(this.textureSizeBuffer, 0, textureSize)

    if (this.realNumberOfCubes) {
      if (this.rendererParams.occlusionActive) {
        {
          const computePass = this.commandEncoder.beginComputePass()
          computePass.label = 'Frustrum/Occluision Culling'
          computePass.setPipeline(this.computePipeline)
          computePass.setBindGroup(0, this.computeBindGroup)
          computePass.setBindGroup(1, this.chunkBindGroup)
          computePass.setBindGroup(2, this.textureSizeBindGroup)
          computePass.dispatchWorkgroups(Math.max(Math.ceil(this.chunksCount / 64), 65_535))
          computePass.end()
          device.queue.submit([this.commandEncoder.finish()])
        }
        {
          this.commandEncoder = device.createCommandEncoder()
          const computePass = this.commandEncoder.beginComputePass()
          computePass.label = 'Texture Index Sorting'
          computePass.setPipeline(this.computeSortPipeline)
          computePass.setBindGroup(0, this.computeBindGroup)
          computePass.setBindGroup(1, this.chunkBindGroup)
          computePass.setBindGroup(2, this.textureSizeBindGroup)
          computePass.dispatchWorkgroups(Math.ceil(this.canvas.width / 16), Math.ceil(this.canvas.height / 16))
          computePass.end()
          if (!this.indirectDrawBufferMapBeingUsed) {
            this.commandEncoder.copyBufferToBuffer(this.indirectDrawBuffer, 0, this.indirectDrawBufferMap, 0, 16)
          }
          device.queue.submit([this.commandEncoder.finish()])
        }
      }
      {
        this.commandEncoder = device.createCommandEncoder()
        const renderPass = this.commandEncoder.beginRenderPass(this.renderPassDescriptor)
        renderPass.label = 'Voxel Main Pass'
        renderPass.setPipeline(pipeline)
        renderPass.setBindGroup(0, this.uniformBindGroup)
        renderPass.setVertexBuffer(0, verticesBuffer)
        renderPass.setBindGroup(1, this.vertexCubeBindGroup)
        // Use indirect drawing
        renderPass.drawIndirect(this.indirectDrawBuffer, 0)
        if (this.rendererParams.secondCamera) {
          renderPass.setBindGroup(0, this.secondCameraUniformBindGroup)
          renderPass.setViewport(this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2, this.canvas.height / 2, 0, 0)
          renderPass.drawIndirect(this.indirectDrawBuffer, 0)
        }
        renderPass.end()


        device.queue.submit([this.commandEncoder.finish()])
      }
      // Volumetric lighting pass
      if (this.rendererParams.godRays) {
        this.commandEncoder = device.createCommandEncoder()
        const volumtetricRenderPass = this.commandEncoder.beginRenderPass(this.volumetricRenderPassDescriptor)
        volumtetricRenderPass.label = 'Volumetric Render Pass'
        volumtetricRenderPass.setPipeline(this.volumetricPipeline)
        volumtetricRenderPass.setVertexBuffer(0, verticesBuffer)
        volumtetricRenderPass.setBindGroup(0, this.VolumetricBindGroup)
        volumtetricRenderPass.draw(quadVertexCountStrip)
        volumtetricRenderPass.end()
        device.queue.submit([this.commandEncoder.finish()])
      }
    }
    if (chunksStorage.updateQueue.length) {
      // console.time('updateBlocks')
      // eslint-disable-next-line unicorn/no-useless-spread
      const queue = [...chunksStorage.updateQueue.slice(0, 0)]
      let updateCount = 0
      for (const q of chunksStorage.updateQueue) {
        queue.push(q)
        updateCount += q.end - q.start
        if (updateCount > chunksStorage.maxDataUpdate) {
          break // to next frame
        }
      }
      while (chunksStorage.updateQueue.length) {
        this.updateCubesBuffersDataFromLoop()
      }
      for (const { start, end } of queue) {
        chunksStorage.clearRange(start, end)
      }
      // console.timeEnd('updateBlocks')
    } else if (this.chunksFadeAnimationController.updateWasMade) {
      this.updateChunks(chunksStorage.chunks)
    }

    if (!this.indirectDrawBufferMapBeingUsed && (!this.renderingStatsRequestTime || time - this.renderingStatsRequestTime > 500)) {
      this.renderingStatsRequestTime = time
      void this.getRenderingTilesCount().then((result) => {
        this.renderingStats = result
      })
    }

    this.loopPost()

    this.renderedFrames++
    nextFrame()
    this.notRenderedBlockChanges = 0
    const took = performance.now() - start
    this.renderMs += took
    this.renderMsCount++
    if (took > 55) {
      console.log('One frame render loop took', took)
    }
  }

  loopPre (timeDiff: number) {
    if (!this.cameraUpdated) {
      this.noCameraUpdates++
      if (this.lastCameraUpdateDiff && this.positiveCameraUpdates) {
        const pos = {} as { x: number, y: number, z: number }
        for (const key of ['x', 'y', 'z']) {
          const msDiff = this.lastCameraUpdateDiff[key] / this.lastCameraUpdateDiff.time
          pos[key] = this.camera.position[key] + msDiff * timeDiff
        }
        this.updateCameraPos(pos)
      }
    }

  }

  loopPost () {
    this.cameraUpdated = false
  }

  updateCameraPos (newPos: { x: number, y: number, z: number }) {
    //this.camera.position.set(newPos.x, newPos.y, newPos.z)
    new tweenJs.Tween(this.camera.position).to({ x: newPos.x, y: newPos.y, z: newPos.z }, 50).start()
  }

  async getRenderingTilesCount () {
    this.indirectDrawBufferMapBeingUsed = true
    await this.indirectDrawBufferMap.mapAsync(GPUMapMode.READ)
    const arrayBuffer = this.indirectDrawBufferMap.getMappedRange()
    const data = new Uint32Array(arrayBuffer)
    // Read the indirect draw parameters
    const vertexCount = data[0]
    const instanceCount = data[1]
    const firstVertex = data[2]
    const firstInstance = data[3]
    this.indirectDrawBufferMap.unmap()
    this.indirectDrawBufferMapBeingUsed = false
    return { vertexCount, instanceCount, firstVertex, firstInstance }
  }

  destroy () {
    this.rendering = false
    this.device.destroy()
  }
}

const debugCheckDuplicates = (arr: any[]) => {
  const seen = new Set()
  for (const item of arr) {
    if (seen.has(item)) throw new Error(`Duplicate: ${item}`)
    seen.add(item)
  }
}

class IndexedInOutAnimationController {
  lastUpdateTime?: number
  indexes: Record<string, { progress: number, isAdding: boolean, onRemoved?: () => void }> = {}
  updateWasMade = false

  constructor (public updateIndex: (key: string, progress: number, removed: boolean) => void, public DURATION = 500) { }

  update (time: number) {
    this.updateWasMade = false
    this.lastUpdateTime ??= time
    // eslint-disable-next-line guard-for-in
    for (const key in this.indexes) {
      const data = this.indexes[key]
      const timeDelta = (time - this.lastUpdateTime) / this.DURATION
      let removed = false
      if (data.isAdding) {
        data.progress += timeDelta
        if (data.progress >= 1) {
          delete this.indexes[key]
        }
      } else {
        data.progress -= timeDelta
        if (data.progress <= 0) {
          delete this.indexes[key]
          removed = true
          data.onRemoved?.()
        }
      }
      this.updateIndex(key, data.progress, removed)
      this.updateWasMade = true
    }
    this.lastUpdateTime = time
  }

  addIndex (key: string) {
    this.indexes[key] = { progress: 0, isAdding: true }
  }

  removeIndex (key: string, onRemoved?: () => void) {
    if (this.indexes[key]) {
      this.indexes[key].isAdding = false
      this.indexes[key].onRemoved = onRemoved
    } else {
      this.indexes[key] = { progress: 1, isAdding: false, onRemoved }
    }
  }
}
