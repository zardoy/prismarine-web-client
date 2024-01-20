// not all options are watched here

import { subscribeKey } from 'valtio/utils'
import { options, watchValue } from './optionsStorage'
import { reloadChunks } from './utils'

subscribeKey(options, 'renderDistance', reloadChunks)
subscribeKey(options, 'multiplayerRenderDistance', reloadChunks)

watchValue(options, o => {
  document.documentElement.style.setProperty('--chatScale', `${o.chatScale / 100}`)
  document.documentElement.style.setProperty('--chatWidth', `${o.chatWidth}px`)
  document.documentElement.style.setProperty('--chatHeight', `${o.chatHeight}px`)
  document.documentElement.style.setProperty('--guiScale', `${o.guiScale}`)
})

export const watchOptionsAfterViewerInit = () => {
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
}
