// not all options are watched here

import { subscribeKey } from 'valtio/utils'
import { WorldRendererThree } from 'prismarine-viewer/viewer/lib/worldrendererThree'
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
  document.documentElement.style.setProperty('--guiScale', `${o.guiScale}`)
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
    viewer.entities.setVisible(o.renderEntities)
  })

  viewer.world.smoothLighting = options.smoothLighting
  subscribeKey(options, 'smoothLighting', () => {
    viewer.world.smoothLighting = options.smoothLighting;
    (viewer.world as WorldRendererThree).rerenderAllChunks()
  })
  subscribeKey(options, 'newVersionsLighting', () => {
    viewer.world.enableLighting = !bot.supportFeature('blockStateId') || options.newVersionsLighting;
    (viewer.world as WorldRendererThree).rerenderAllChunks()
  })
  customEvents.on('gameLoaded', () => {
    viewer.world.enableLighting = !bot.supportFeature('blockStateId') || options.newVersionsLighting
  })
}
