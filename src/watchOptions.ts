// not all options are watched here

import { subscribeKey } from 'valtio/utils'
import { options, watchValue } from './optionsStorage'
import { reloadChunks } from './utils'

subscribeKey(options, 'renderDistance', reloadChunks)

export const watchOptionsAfterViewerInit = () => {
  watchValue(options, o => {
    viewer.world.showChunkBorders = o.showChunkBorders
  })
}
