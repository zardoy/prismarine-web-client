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
