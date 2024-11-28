import { promisify } from 'util'
import fs from 'fs'
import * as nbt from 'prismarine-nbt'
import RegionFile from 'prismarine-provider-anvil/src/region'
import { versions } from 'minecraft-data'
import { openWorldDirectory, openWorldZip } from './browserfs'
import { isGameActive } from './globalState'
import { showNotification } from './react/NotificationProvider'

const parseNbt = promisify(nbt.parse)
const simplifyNbt = nbt.simplify
window.nbt = nbt

// todo display drop zone
for (const event of ['drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop']) {
  window.addEventListener(event, (e: any) => {
    if (e.dataTransfer && !e.dataTransfer.types.includes('Files')) {
      // e.dataTransfer.effectAllowed = "none"
      return
    }
    e.preventDefault()
  })
}
window.addEventListener('drop', async e => {
  if (!e.dataTransfer?.files.length) return
  const { items } = e.dataTransfer
  const item = items[0]
  if (item.getAsFileSystemHandle) {
    const filehandle = await item.getAsFileSystemHandle() as FileSystemFileHandle | FileSystemDirectoryHandle
    if (filehandle.kind === 'file') {
      const file = await filehandle.getFile()

      await handleDroppedFile(file)
    } else {
      if (isGameActive(false)) {
        alert('Exit current world first, before loading a new one.')
        return
      }
      await openWorldDirectory(filehandle)
    }
  } else {
    await handleDroppedFile(item.getAsFile()!)
  }
})

async function handleDroppedFile (file: File) {
  if (file.name.endsWith('.zip')) {
    void openWorldZip(file)
    return
  }
  // if (file.name.endsWith('.mca')) // TODO let's do something interesting with it: viewer?
  if (file.name.endsWith('.rar')) {
    alert('Rar files are not supported yet!')
    return
  }
  if (file.name.endsWith('.mca')) {
    const tempPath = '/data/temp.mca'
    try {
      await fs.promises.writeFile(tempPath, Buffer.from(await file.arrayBuffer()))
      const region = new RegionFile(tempPath)
      await region.initialize()
      const chunks: Record<string, any> = {}
      console.log('Reading chunks...')
      console.log(chunks)
      let versionDetected = false
      for (const [i, _] of Array.from({ length: 32 }).entries()) {
        for (const [k, _] of Array.from({ length: 32 }).entries()) {
          // todo, may use faster reading, but features is not commonly used
          // eslint-disable-next-line no-await-in-loop
          const nbt = await region.read(i, k)
          chunks[`${i},${k}`] = nbt
          if (nbt && !versionDetected) {
            const simplified = simplifyNbt(nbt)
            const version = versions.pc.find(x => x['dataVersion'] === simplified.DataVersion)?.minecraftVersion
            console.log('Detected version', version ?? 'unknown')
            versionDetected = true
          }
        }
      }
      Object.defineProperty(chunks, 'simplified', {
        get () {
          const mapped = {}
          for (const [i, _] of Array.from({ length: 32 }).entries()) {
            for (const [k, _] of Array.from({ length: 32 }).entries()) {
              const key = `${i},${k}`
              const chunk = chunks[key]
              if (!chunk) continue
              mapped[key] = simplifyNbt(chunk)
            }
          }
          return mapped
        },
      })
      console.log('Done!', chunks)
    } finally {
      await fs.promises.unlink(tempPath)
    }
    return
  }

  const buffer = await file.arrayBuffer()
  const parsed = await parseNbt(Buffer.from(buffer)).catch((err) => {
    alert('Couldn\'t parse nbt, ensure you are opening .dat or file (or .zip/folder with a world)')
    throw err
  })
  showNotification(`${file.name} data available in browser console`)
  console.log('raw', parsed)
  console.log('simplified', nbt.simplify(parsed))
}
