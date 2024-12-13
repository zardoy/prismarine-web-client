const workerParam = new URLSearchParams(typeof window === 'undefined' ? '?' : window.location.search).get('webgpuWorker')
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

export const defaultWebgpuRendererParams = {
  secondCamera: false,
  MSAA: false,
  cameraOffset: [0, 0, 0] as [number, number, number],
  webgpuWorker: workerParam ? workerParam === 'true' : !isSafari,
  godRays: true,
  occlusionActive: true,
  earlyZRejection: false,
  allowChunksViewUpdate: false
}

export const rendererParamsGui = {
  secondCamera: true,
  MSAA: true,
  webgpuWorker: {
    qsReload: true
  },
  godRays: true,
  occlusionActive: true,
  earlyZRejection: true,
  allowChunksViewUpdate: true
}

export const WEBGPU_FULL_TEXTURES_LIMIT = 1024
export const WEBGPU_HEIGHT_LIMIT = 1024

export type RendererInitParams = GPURequestAdapterOptions & {}

export type RendererParams = typeof defaultWebgpuRendererParams