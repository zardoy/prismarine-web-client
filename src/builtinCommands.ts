import fs from 'fs'
import { join } from 'path'
import JSZip from 'jszip'
import { readLevelDat } from './loadSave'
import { closeWan, openToWanAndCopyJoinLink } from './localServerMultiplayer'
import { copyFilesAsync, uniqueFileNameFromWorldName } from './browserfs'
import { saveServer } from './flyingSquidUtils'
import { setLoadingScreenStatus } from './utils'
import { displayClientChat } from './botUtils'

const notImplemented = () => {
  return 'Not implemented yet'
}

async function addFolderToZip (folderPath, zip, relativePath) {
  const entries = await fs.promises.readdir(folderPath)

  for (const entry of entries) {
    const entryPath = join(folderPath, entry)
    const stats = await fs.promises.stat(entryPath)

    const zipEntryPath = join(relativePath, entry)

    if (stats.isDirectory()) {
      const subZip = zip.folder(zipEntryPath)
      await addFolderToZip(entryPath, subZip, zipEntryPath)
    } else {
      const fileData = await fs.promises.readFile(entryPath)
      zip.file(entry, fileData)
    }
  }
}

export const exportWorld = async (path: string, type: 'zip' | 'folder', zipName = 'world-prismarine-exported') => {
  try {
    if (type === 'zip') {
      setLoadingScreenStatus('Generating zip, this may take a few minutes')
      const zip = new JSZip()
      await addFolderToZip(path, zip, '')

      // Generate the ZIP archive content
      const zipContent = await zip.generateAsync({ type: 'blob' })

      // Create a download link and trigger the download
      const downloadLink = document.createElement('a')
      downloadLink.href = URL.createObjectURL(zipContent)
      // todo use loaded zip/folder name
      downloadLink.download = `${zipName}.zip`
      downloadLink.click()

      // Clean up the URL object after download
      URL.revokeObjectURL(downloadLink.href)
    } else {
      setLoadingScreenStatus('Preparing export folder')
      let dest = '/'
      if ((await fs.promises.readdir('/export')).length) {
        const { levelDat } = (await readLevelDat(path))!
        dest = await uniqueFileNameFromWorldName(levelDat.LevelName, path)
      }
      setLoadingScreenStatus(`Copying files to ${dest} of selected folder`)
      await copyFilesAsync(path, '/export' + dest)
    }
  } finally {
    setLoadingScreenStatus(undefined)
  }
}

// todo include in help
const exportLoadedWorld = async () => {
  await saveServer()
  let { worldFolder } = localServer!.options
  if (!worldFolder.startsWith('/')) worldFolder = `/${worldFolder}`
  await exportWorld(worldFolder, 'zip')
}

window.exportWorld = exportLoadedWorld

const writeText = (text) => {
  displayClientChat(text)
}

const commands: Array<{
  command: string[],
  invoke (): Promise<void> | void
  //@ts-format-ignore-region
}> = [
  {
    command: ['/download', '/export'],
    invoke: exportLoadedWorld
  },
  {
    command: ['/publish', '/share'],
    async invoke () {
      const text = await openToWanAndCopyJoinLink(writeText)
      if (text) writeText(text)
    }
  },
  {
    command: ['/close'],
    invoke () {
      const text = closeWan()
      if (text) writeText(text)
    }
  },
  {
    command: ['/save'],
    async invoke () {
      await saveServer(false)
      writeText('Saved to browser memory')
    }
  }
]
//@ts-format-ignore-endregion

export const getBuiltinCommandsList = () => commands.flatMap(command => command.command)

export const tryHandleBuiltinCommand = (message) => {
  if (!localServer) return

  for (const command of commands) {
    if (command.command.includes(message)) {
      void command.invoke() // ignoring for now
      return true
    }
  }
}
