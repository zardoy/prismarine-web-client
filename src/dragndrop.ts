import { promisify } from 'util'
import * as nbt from 'prismarine-nbt'
import { openWorldDirectory, openWorldZip } from './browserfs'
import { isGameActive, showNotification } from './globalState'

const parseNbt = promisify(nbt.parse)
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

  const buffer = await file.arrayBuffer()
  const parsed = await parseNbt(Buffer.from(buffer)).catch((err) => {
    alert('Couldn\'t parse nbt, ensure you are opening .dat or file (or .zip/folder with a world)')
    throw err
  })
  showNotification({
    message: `${file.name} data available in browser console`,
  })
  console.log('raw', parsed)
  console.log('simplified', nbt.simplify(parsed))
}
