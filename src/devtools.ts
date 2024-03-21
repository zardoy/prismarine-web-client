// global variables useful for debugging

import { getEntityCursor } from './worldInteractions'

// Object.defineProperty(window, 'cursorBlock', )

window.cursorBlockRel = (x = 0, y = 0, z = 0) => {
  const newPos = bot.blockAtCursor(5)?.position.offset(x, y, z)
  if (!newPos) return
  return bot.world.getBlock(newPos)
}

window.cursorEntity = () => {
  return getEntityCursor()
}

// wanderer
window.inspectPlayer = () => require('fs').promises.readFile('/world/playerdata/9e487d23-2ffc-365a-b1f8-f38203f59233.dat').then(window.nbt.parse).then(console.log)

Object.defineProperty(window, 'debugSceneChunks', {
  get () {
    return viewer.world.getLoadedChunksRelative(bot.entity.position, true)
  },
})
