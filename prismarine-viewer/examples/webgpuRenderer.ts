import * as THREE from 'three';
import { BlockFaceType } from './shared';
import * as tweenJs from '@tweenjs/tween.js';
import { cubePositionOffset, cubeUVOffset, cubeVertexArray, cubeVertexCount, cubeVertexSize } from './CubeDef';
import VertShader from './Cube.vert.wgsl';
import FragShader from './Cube.frag.wgsl';
import { updateSize, allSides } from './webgpuRendererWorker';

export class WebgpuRenderer {
    rendering = true
    NUMBER_OF_CUBES = 100000;
    renderedFrames = 0

    ready = false;

    device: GPUDevice;
    renderPassDescriptor: GPURenderPassDescriptor;
    uniformBindGroup: GPUBindGroup;
    UniformBuffer: GPUBuffer;
    ViewUniformBuffer: GPUBuffer;
    ProjectionUniformBuffer: GPUBuffer;
    ctx: GPUCanvasContext;
    verticesBuffer: GPUBuffer;
    InstancedModelBuffer: GPUBuffer;
    pipeline: GPURenderPipeline;
    InstancedTextureIndexBuffer: GPUBuffer;
    InstancedColorBuffer: GPUBuffer;
    notRenderedAdditions = 0;

    constructor(public canvas: HTMLCanvasElement, public imageBlob: ImageBitmapSource, public isPlayground: boolean, public camera: THREE.PerspectiveCamera, public FragShaderOverride?) {
        this.init();
    }

    async init () {
        const { canvas, imageBlob, isPlayground, FragShaderOverride } = this;

        updateSize(canvas.width, canvas.height);
        // export const initWebglRenderer = async (canvas: HTMLCanvasElement, imageBlob: ImageBitmapSource, isPlayground: boolean, FragShaderOverride?) => {
        // isPlayground = false
        // blockStates = blockStatesJson
        const textureBitmap = await createImageBitmap(imageBlob);
        const textureWidth = textureBitmap.width;
        const textureHeight = textureBitmap.height;

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error('WebGPU not supported');
        this.device = await adapter.requestDevice();
        const { device } = this;

        const ctx = this.ctx = canvas.getContext('webgpu')!;

        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

        ctx.configure({
            device,
            format: presentationFormat,
            alphaMode: 'premultiplied',
        });


        const verticesBuffer = device.createBuffer({
            size: cubeVertexArray.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
        this.verticesBuffer = verticesBuffer;
        new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
        verticesBuffer.unmap();



        this.InstancedModelBuffer = device.createBuffer({
            size: this.NUMBER_OF_CUBES * 4 * 3,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        this.InstancedTextureIndexBuffer = device.createBuffer({
            size: this.NUMBER_OF_CUBES * 4 * 1,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        this.InstancedColorBuffer = device.createBuffer({
            size: this.NUMBER_OF_CUBES * 4 * 3,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });


        //device.StepM
        const vertexCode = VertShader;
        const fragmentCode = FragShader;

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
                                format: 'float32x3',
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
                        arrayStride: 3 * 4,
                        attributes: [
                            {
                                // ModelMatrix
                                shaderLocation: 2,
                                offset: 0,
                                format: 'float32x3',
                            }
                        ],
                        stepMode: 'instance',
                    },
                    {
                        arrayStride: 1 * 4,
                        attributes: [
                            {
                                // ModelMatrix
                                shaderLocation: 3,
                                offset: 0,
                                format: 'float32',
                            }
                        ],
                        stepMode: 'instance',
                    },
                    {
                        arrayStride: 3 * 4,
                        attributes: [
                            {
                                // ModelMatrix
                                shaderLocation: 4,
                                offset: 0,
                                format: 'float32x3',
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
                // topology: 'triangle-strip',
                topology: 'triangle-list',
                cullMode: 'front',
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus',
            },
        });
        this.pipeline = pipeline;

        // const cullInstanceModule = this.device.createShaderModule({
        //     label: 'Cull Instances',
        //     code: CULLING_SHADER,
        // });

        // device.createComputePipelineAsync({
        //     label: "Cull Instances",
        //     layout: device.createPipelineLayout({
        //         bindGroupLayouts: [
        //             this.frameBindGroupLayout,
        //             culledInstanceBindGroupLayout,
        //         ]
        //     }),
        //     compute: {
        //         module: cullInstanceModule,
        //         entryPoint: 'computeMain',
        //     }
        // }).then((pipeline) => {
        //     this.cullInstancesPipeline = pipeline;
        // });

        const depthTexture = device.createTexture({
            size: [canvas.width, canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

        const uniformBufferSize = 4 * (4 * 4); // 4x4 matrix
        this.UniformBuffer = device.createBuffer({
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // Fetch the image and upload it into a GPUTexture.
        let cubeTexture: GPUTexture;
        {
            cubeTexture = device.createTexture({
                size: [textureBitmap.width, textureBitmap.height, 1],
                //format: 'rgba8unorm',
                format: 'rgb10a2unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.RENDER_ATTACHMENT,
            });
            device.queue.copyExternalImageToTexture(
                { source: textureBitmap },
                { texture: cubeTexture },
                [textureBitmap.width, textureBitmap.height]
            );
        }

        const sampler = device.createSampler({
            magFilter: 'nearest',
            minFilter: 'nearest',
        });

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
        });

        this.renderPassDescriptor = {
            colorAttachments: [
                {
                    view: undefined as any, // Assigned later
                    clearValue: [0.6784313725490196, 0.8470588235294118, 0.9019607843137255, 1],
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
        };


        // always last!
        this.rendering = false;
        this.loop();
        this.ready = true;
        return canvas;
    }

    removeOne () {
    }

    realNumberOfCubes = 0;

    updateSides (start = 0) {
        this.rendering = true;
        const positions = [] as number[];
        let textureIndexes = [] as number[];
        let colors = [] as number[];
        const blocksPerFace = {} as Record<string, BlockFaceType>;
        for (const side of allSides.slice(start)) {
            if (!side) continue;
            const [x, y, z] = side.slice(0, 3);
            const key = `${x},${y},${z}`;
            if (blocksPerFace[key]) continue;
            blocksPerFace[key] = side[3];
        }
        for (const key in blocksPerFace) {
            const side = key.split(',').map(Number);
            positions.push(...[side[0], side[1], side[2]]);
            const face = blocksPerFace[key];
            textureIndexes.push(face.textureIndex);
            colors.push(1, 1, 1);
        }

        this.realNumberOfCubes = positions.length;
        if (positions.length > this.NUMBER_OF_CUBES) {
            this.NUMBER_OF_CUBES = positions.length + 1000;
        }

        const setModelBuffer = async (modelBuffer: GPUBuffer, data: Float32Array) => {
            this.device.queue.writeBuffer(modelBuffer, 0, data /* , 0, 16 */);
        };

        setModelBuffer(this.InstancedModelBuffer, new Float32Array(positions));

        setModelBuffer(this.InstancedTextureIndexBuffer, new Float32Array(textureIndexes));

        setModelBuffer(this.InstancedColorBuffer, new Float32Array(colors));

        this.notRenderedAdditions++;
    }


    lastCall = performance.now();
    logged = false;
    loop () {
        if (!this.rendering) {
            requestAnimationFrame(() => this.loop());
            return;
        }

        const { device, UniformBuffer: uniformBuffer, renderPassDescriptor, uniformBindGroup, pipeline, ctx, verticesBuffer } = this;

        const now = Date.now();
        tweenJs.update();

        const ViewProjectionMat4 = new THREE.Matrix4();
        this.camera.updateMatrix();
        const projectionMatrix = this.camera.projectionMatrix;
        ViewProjectionMat4.multiplyMatrices(projectionMatrix, this.camera.matrix.invert());
        const ViewProjection = new Float32Array(ViewProjectionMat4.elements);
        // globalThis.ViewProjection = ViewProjection
        device.queue.writeBuffer(
            uniformBuffer,
            0,
            ViewProjection.buffer,
            ViewProjection.byteOffset,
            ViewProjection.byteLength
        );



        renderPassDescriptor.colorAttachments[0].view = ctx
            .getCurrentTexture()
            .createView();

        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor);
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, this.uniformBindGroup);
        passEncoder.setVertexBuffer(0, verticesBuffer);
        passEncoder.setVertexBuffer(1, this.InstancedModelBuffer);
        passEncoder.setVertexBuffer(2, this.InstancedTextureIndexBuffer);
        passEncoder.setVertexBuffer(3, this.InstancedColorBuffer);


        passEncoder.draw(cubeVertexCount, this.NUMBER_OF_CUBES);

        passEncoder.end();
        device.queue.submit([commandEncoder.finish()]);

        this.renderedFrames++;
        requestAnimationFrame(() => this.loop());
        this.notRenderedAdditions = 0;
    }
}
