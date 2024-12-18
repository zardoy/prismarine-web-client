// not all options are watched here

import { subscribeKey } from 'valtio/utils'
import { WorldRendererThree } from 'prismarine-viewer/viewer/lib/worldrendererThree'
import { isMobile } from 'prismarine-viewer/viewer/lib/simpleUtils'
import { WorldRendererWebgpu } from 'prismarine-viewer/viewer/lib/worldrendererWebgpu'
import { defaultWebgpuRendererParams } from 'prismarine-viewer/examples/webgpuRendererShared'
import { options, watchValue } from './optionsStorage'
import { reloadChunks } from './utils'
import { miscUiState } from './globalState'
import { toggleStatsVisibility } from './topRightStats'
import { updateLocalServerSettings } from './integratedServer/main'

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
    viewer.world.config.showChunkBorders = o.showChunkBorders
    viewer.entities.setDebugMode(o.showChunkBorders ? 'basic' : 'none')
  })

  watchValue(options, o => {
    if (!viewer) return
    // todo ideally there shouldnt be this setting and we don't need to send all same chunks to all workers
    viewer.world.config.numWorkers = o.lowMemoryMode ? 1 : o.numWorkers
  })

  watchValue(options, o => {
    viewer.entities.setRendering(o.renderEntities)
  })

  if (options.renderDebug === 'none') {
    toggleStatsVisibility(false)
  }
  subscribeKey(options, 'renderDebug', () => {
    if (options.renderDebug === 'none') {
      toggleStatsVisibility(false)
    } else {
      toggleStatsVisibility(true)
    }
  })
  watchValue(options, o => {
    viewer.world.displayStats = o.renderDebug === 'advanced'
  })
  watchValue(options, (o, isChanged) => {
    viewer.world.mesherConfig.clipWorldBelowY = o.clipWorldBelowY
    viewer.world.mesherConfig.disableSignsMapsSupport = o.disableSignsMapsSupport
    if (isChanged) {
      if (viewer.world instanceof WorldRendererThree) {
        (viewer.world as WorldRendererThree).rerenderAllChunks()
      }
    }
  })

  watchValue(options, o => {
    updateLocalServerSettings({
      autoSave: o.singleplayerAutoSave
    })
  })

  viewer.world.mesherConfig.smoothLighting = options.smoothLighting
  subscribeKey(options, 'smoothLighting', () => {
    viewer.world.mesherConfig.smoothLighting = options.smoothLighting
    if (viewer.world instanceof WorldRendererThree) {
      (viewer.world as WorldRendererThree).rerenderAllChunks()
    }
  })
  subscribeKey(options, 'newVersionsLighting', () => {
    viewer.world.mesherConfig.enableLighting = !bot.supportFeature('blockStateId') || options.newVersionsLighting
    if (viewer.world instanceof WorldRendererThree) {
      (viewer.world as WorldRendererThree).rerenderAllChunks()
    }
  })
  customEvents.on('gameLoaded', () => {
    viewer.world.mesherConfig.enableLighting = !bot.supportFeature('blockStateId') || options.newVersionsLighting
  })

  watchValue(options, o => {
    if (!(viewer.world instanceof WorldRendererThree)) return
    (viewer.world as WorldRendererThree).starField.enabled = o.starfieldRendering
  })

  watchValue(options, o => {
    viewer.world.neighborChunkUpdates = o.neighborChunkUpdates
  })
  watchValue(options, o => {
    viewer.powerPreference = o.gpuPreference
  })

  onRendererParamsUpdate()

  if (viewer.world instanceof WorldRendererWebgpu) {
    Object.assign(viewer.world.rendererParams, options.webgpuRendererParams)
    const oldUpdateRendererParams = viewer.world.updateRendererParams.bind(viewer.world)
    viewer.world.updateRendererParams = (...args) => {
      oldUpdateRendererParams(...args)
      Object.assign(options.webgpuRendererParams, viewer.world.rendererParams)
      onRendererParamsUpdate()
    }
  }
}

const onRendererParamsUpdate = () => {
  if (worldView) {
    worldView.allowPositionUpdate = viewer.world.rendererParams.allowChunksViewUpdate
  }
  updateLocalServerSettings({
    stopLoad: !viewer.world.rendererParams.allowChunksViewUpdate
  })
}

let viewWatched = false
export const watchOptionsAfterWorldViewInit = () => {
  onRendererParamsUpdate()
  if (viewWatched) return
  viewWatched = true
  watchValue(options, o => {
    if (!worldView) return
    worldView.keepChunksDistance = o.keepChunksDistance
    viewer.world.config.displayHand = o.handDisplay
  })
}
