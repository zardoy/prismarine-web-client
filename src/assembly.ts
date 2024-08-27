import { _createChunkHandle, _getLightAt, _updateLightAt } from './MCLight'

window.getBlockAt = (...args) => {
  console.log('getBlockAt', args)
}
window.getChunkHandleAt = (...args) => {
  console.log('getChunkHandleAt', args)
}

window.wasm = {
  _createChunkHandle,
  _getLightAt,
  _updateLightAt
}

window.testWasm = () => {
  const handle = 0
  const X = 0
  const Y = 0
  const Z = 0
  const ambientDarkness = 0
  window.wasm._createChunkHandle(handle, 0, 0, -64, 256)
  window.wasm._updateLightAt(handle, X, Y, Z)
  window.wasm._getLightAt(handle, X, Y, Z, ambientDarkness)
}
