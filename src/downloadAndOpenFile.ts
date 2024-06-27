import prettyBytes from 'pretty-bytes'
import { openWorldZip } from './browserfs'
import { getResourcePackName, installTexturePack, resourcePackState, updateTexturePackInstalledState } from './texturePack'
import { setLoadingScreenStatus } from './utils'
import { ConnectOptions } from './connect'

export const getFixedFilesize = (bytes: number) => {
  return prettyBytes(bytes, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const downloadAndOpenFileFromUrl = async (mapUrl: string | undefined, texturepackUrl: string | undefined, connectOptions?: Partial<ConnectOptions>) => {
  // fixme
  if (texturepackUrl) mapUrl = texturepackUrl
  if (!mapUrl) return false

  if (texturepackUrl) {
    await updateTexturePackInstalledState()
    if (resourcePackState.resourcePackInstalled) {
      if (!confirm(`You are going to install a new resource pack, which will REPLACE the current one: ${await getResourcePackName()} Continue?`)) return
    }
  }
  const name = mapUrl.slice(mapUrl.lastIndexOf('/') + 1).slice(-25)
  const downloadThing = texturepackUrl ? 'texturepack' : 'world'
  setLoadingScreenStatus(`Downloading ${downloadThing} ${name}...`)

  const response = await fetch(mapUrl)
  const contentType = response.headers.get('Content-Type')
  if (!contentType || !contentType.startsWith('application/zip')) {
    alert('Invalid map file')
  }
  const contentLengthStr = response.headers?.get('Content-Length')
  const contentLength = contentLengthStr && +contentLengthStr
  setLoadingScreenStatus(`Downloading ${downloadThing} ${name}: have to download ${contentLength && getFixedFilesize(contentLength)}...`)

  let downloadedBytes = 0
  const buffer = await new Response(
    new ReadableStream({
      async start (controller) {
        if (!response.body) throw new Error('Server returned no response!')
        const reader = response.body.getReader()

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            controller.close()
            break
          }

          downloadedBytes += value.byteLength

          // Calculate download progress as a percentage
          const progress = contentLength ? (downloadedBytes / contentLength) * 100 : undefined
          setLoadingScreenStatus(`Download ${downloadThing} progress: ${progress === undefined ? '?' : Math.floor(progress)}% (${getFixedFilesize(downloadedBytes)} / ${contentLength && getFixedFilesize(contentLength)})`, false, true)


          // Pass the received data to the controller
          controller.enqueue(value)
        }
      },
    })
  ).arrayBuffer()
  if (texturepackUrl) {
    const name = mapUrl.slice(mapUrl.lastIndexOf('/') + 1).slice(-30)
    await installTexturePack(buffer, name)
  } else {
    await openWorldZip(buffer, undefined, connectOptions)
  }
}

export default async () => {
  try {
    const qs = new URLSearchParams(window.location.search)
    const mapUrl = qs.get('map')
    const texturepack = qs.get('texturepack')
    return await downloadAndOpenFileFromUrl(mapUrl ?? undefined, texturepack ?? undefined)
  } catch (err) {
    setLoadingScreenStatus(`Failed to download. Either refresh page or remove map param from URL. Reason: ${err.message}`)
    return true
  }
}
