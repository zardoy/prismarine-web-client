import { BasePlaygroundScene } from './baseScene'
import { playgroundGlobalUiState } from './playgroundUi'
import * as scenes from './scenes'

const qsScene = new URLSearchParams(window.location.search).get('scene')
// eslint-disable-next-line unicorn/no-useless-spread
playgroundGlobalUiState.scenes = [...new Set([...Object.keys(scenes)])]
playgroundGlobalUiState.selected = qsScene ?? 'floorRandom'
playgroundGlobalUiState.actions = {
  'Lock camera in URL' () {
    scene.lockCameraInUrl()
  },
  'Reset camera' () {
    scene.resetCamera()
  }
}
const Scene: typeof BasePlaygroundScene = scenes[playgroundGlobalUiState.selected]

const scene = new Scene()
globalThis.scene = scene
