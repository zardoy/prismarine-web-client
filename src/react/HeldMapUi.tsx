import { useEffect, useState } from 'react'
import { mapDownloader } from 'mineflayer-item-map-downloader/'
import { setImageConverter } from 'mineflayer-item-map-downloader/lib/util'

export default () => {
  const [dataUrl, setDataUrl] = useState<string | null | true>(null) // true means loading

  useEffect(() => {
    bot.loadPlugin(mapDownloader)

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

    // TODO delete maps!
    const updateHeldMap = () => {
      setDataUrl(null)
      if (!bot.heldItem || !['filled_map', 'map'].includes(bot.heldItem.name)) return
      // setDataUrl(true)
      const mapNumber = (bot.heldItem?.nbt?.value as any)?.map?.value
      // if (!mapNumber) return
      setDataUrl(bot.mapDownloader.maps?.[mapNumber] as unknown as string)
    }

    bot.on('heldItemChanged' as any, () => {
      updateHeldMap()
    })

    bot.on('new_map', () => {
      // total maps: Object.keys(bot.mapDownloader.maps).length
      updateHeldMap()
    })
  }, [])

  return dataUrl && dataUrl !== true ? <div style={{
    position: 'fixed',
    bottom: 20,
    left: 8,
    pointerEvents: 'none',
  }}
  >
    <img
      src={dataUrl} style={{
        width: 92,
        height: 92,
        imageRendering: 'pixelated',
      }}
    />
  </div> : null
}
