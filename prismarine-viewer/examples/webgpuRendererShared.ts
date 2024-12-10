export const defaultWebgpuRendererParams = {
  secondCamera: false,
  MSAA: false,
  cameraOffset: [0, 0, 0] as [number, number, number],
  webgpuWorker: true,
}

export const rendererParamsGui = {
  secondCamera: true,
  MSAA: true,
  webgpuWorker: {
    qsReload: true
  }
}

export type RendererInitParams = GPURequestAdapterOptions & {}

export type RendererParams = typeof defaultWebgpuRendererParams
