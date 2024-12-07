export const defaultWebgpuRendererParams = {
  secondCamera: false,
  MSAA: false,
  cameraOffset: [0, 0, 0] as [number, number, number],
}

export type RendererParams = typeof defaultWebgpuRendererParams
