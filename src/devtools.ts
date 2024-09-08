// global variables useful for debugging

import fs from 'fs'
import { WorldRendererThree } from 'prismarine-viewer/viewer/lib/worldrendererThree'
import { getEntityCursor } from './worldInteractions'

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
    return (viewer.world as WorldRendererThree).getLoadedChunksRelative?.(bot.entity.position, true)
  },
})

window.len = (obj) => Object.keys(obj).length

window.inspectPacket = (packetName, full = false) => {
  const listener = (...args) => console.log('packet', packetName, full ? args : args[0])
  const attach = () => {
    bot?._client.on(packetName, listener)
  }
  attach()
  customEvents.on('mineflayerBotCreated', attach)
  const returnobj = {}
  Object.defineProperty(returnobj, 'detach', {
    get () {
      bot?.removeListener(packetName, listener)
      customEvents.removeListener('mineflayerBotCreated', attach)
      return true
    },
  })
  return returnobj
}

window.downloadFile = async (path: string) => {
  if (!path.startsWith('/') && localServer) path = `${localServer.options.worldFolder}/${path}`
  const data = await fs.promises.readFile(path)
  const blob = new Blob([data], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = path.split('/').at(-1)!
  a.click()
  URL.revokeObjectURL(url)
}
