export const defaultWebgpuRendererParams = {
  secondCamera: false,
  MSAA: false,
  cameraOffset: [0, 0, 0] as [number, number, number],
}

export type RendererInitParams = GPURequestAdapterOptions & {}

export type RendererParams = typeof defaultWebgpuRendererParams
