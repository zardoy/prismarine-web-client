export const defaultMesherConfig = {
  version: '',
  enableLighting: true,
  skyLight: 15,
  smoothLighting: true,
  outputFormat: 'threeJs' as 'threeJs' | 'webgl',
  textureSize: 1024, // for testing
  debugModelVariant: undefined as undefined | number[]
}

export type MesherConfig = typeof defaultMesherConfig
