// not all options are watched here

import { subscribeKey } from 'valtio/utils'
import { options, watchValue } from './optionsStorage'
import { reloadChunks } from './utils'
import { miscUiState } from './globalState'
import { isMobile } from './menus/components/common'

subscribeKey(options, 'renderDistance', reloadChunks)
subscribeKey(options, 'multiplayerRenderDistance', reloadChunks)

watchValue(options, o => {
  document.documentElement.style.setProperty('--chatScale', `${o.chatScale / 100}`)
  document.documentElement.style.setProperty('--chatWidth', `${o.chatWidth}px`)
  document.documentElement.style.setProperty('--chatHeight', `${o.chatHeight}px`)
  // gui scale is set in scaleInterface.ts
})

/** happens once */
export const watchOptionsAfterViewerInit = () => {
  const updateTouch = (o) => {
    miscUiState.currentTouch = o.alwaysShowMobileControls || isMobile()
  }

  watchValue(options, updateTouch)
  window.matchMedia('(pointer: coarse)').addEventListener('change', (e) => {
    updateTouch(options)
  })

  watchValue(options, o => {
    if (!viewer) return
    viewer.world.showChunkBorders = o.showChunkBorders
    viewer.entities.setDebugMode(o.showChunkBorders ? 'basic' : 'none')
  })

  watchValue(options, o => {
    if (o.antiAliasing) {
      viewer.enableFxaaScene()
    } else {
      viewer.enableFXAA = false
      viewer.composer = undefined
    }
  })

  watchValue(options, o => {
    viewer.entities.setVisible(o.renderEntities)
  })
}
