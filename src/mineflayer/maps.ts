import { mapDownloader } from 'mineflayer-item-map-downloader'
import { setImageConverter } from 'mineflayer-item-map-downloader/lib/util'

setImageConverter((buf: Uint8Array) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = 128
  canvas.height = 128
  const imageData = ctx.createImageData(canvas.width, canvas.height)
  imageData.data.set(buf)
  ctx.putImageData(imageData, 0, 0)
  // data url
  return canvas.toDataURL('image/png')
})

customEvents.on('mineflayerBotCreated', () => {
  bot.on('login', () => {
    bot.loadPlugin(mapDownloader)
    bot.mapDownloader.on('new_map', ({ png, id }) => {
      viewer.entities.updateMap(id, png)
    })
  })
})
