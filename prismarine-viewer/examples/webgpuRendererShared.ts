const workerParam = new URLSearchParams(typeof window === 'undefined' ? '?' : window.location.search).get('webgpuWorker')
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

export const defaultWebgpuRendererParams = {
  secondCamera: false,
  MSAA: false,
  cameraOffset: [0, 0, 0] as [number, number, number],
  webgpuWorker: workerParam ? workerParam === 'true' : !isSafari,
  godRays: false,
  occlusion: true
}

export const rendererParamsGui = {
  secondCamera: true,
  MSAA: true,
  webgpuWorker: {
    qsReload: true
  },
  godRays: true,
  occlusion: true
}

export type RendererInitParams = GPURequestAdapterOptions & {}

export type RendererParams = typeof defaultWebgpuRendererParams
