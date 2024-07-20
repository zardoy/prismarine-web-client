import { join, dirname } from 'path'
import fs from 'fs'
import JSZip from 'jszip'
import { proxy, ref } from 'valtio'
import type { BlockStates } from './inventoryWindows'
import { copyFilesAsync, copyFilesAsyncWithProgress, mkdirRecursive, removeFileRecursiveAsync } from './browserfs'
import { setLoadingScreenStatus } from './utils'
import { showNotification } from './react/NotificationProvider'
import { options } from './optionsStorage'
import { showOptionsModal } from './react/SelectOption'
import { appStatusState } from './react/AppStatusProvider'

export const resourcePackState = proxy({
  resourcePackInstalled: false,
  currentTexturesDataUrl: undefined as string | undefined,
  currentTexturesBlockStates: undefined as BlockStates | undefined,
})

const getLoadedImage = async (url: string) => {
  const img = new Image()
  img.src = url
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })
  return img
}

const texturePackBasePath2 = '/data/resourcePacks/'
export const uninstallTexturePack = async (name = 'default') => {
  const basePath = texturePackBasePath2 + name
  await removeFileRecursiveAsync(basePath)
  options.enabledResourcepack = null
  await updateTexturePackInstalledState()
}

export const getResourcePackNames = async () => {
  // TODO
  try {
    return { [await fs.promises.readFile(join(texturePackBasePath2, 'default', 'name.txt'), 'utf8')]: true }
  } catch (err) {
    return {}
  }
}

export const fromTexturePackPath = (path) => {
  // return join(texturePackBasePath, path)
}

export const updateTexturePackInstalledState = async () => {
  try {
    resourcePackState.resourcePackInstalled = await existsAsync(texturePackBasePath2 + 'default')
  } catch {
  }
}

export const installTexturePackFromHandle = async () => {
  // await mkdirRecursive(texturePackBasePath)
  // await copyFilesAsyncWithProgress('/world', texturePackBasePath)
  // await completeTexturePackInstall()
}

export const installTexturePack = async (file: File | ArrayBuffer, displayName = file['name'], name = 'default') => {
  try {
    await uninstallTexturePack(name)
  } catch (err) {
  }
  const status = 'Installing resource pack: copying all files'
  setLoadingScreenStatus(status)
  // extract the zip and write to fs every file in it
  const zip = new JSZip()
  const zipFile = await zip.loadAsync(file)
  if (!zipFile.file('pack.mcmeta')) throw new Error('Not a resource pack: missing /pack.mcmeta')
  const basePath = texturePackBasePath2 + name
  await mkdirRecursive(basePath)

  const allFilesArr = Object.entries(zipFile.files)
  let done = 0
  const upStatus = () => {
    setLoadingScreenStatus(`${status} ${Math.round(done / allFilesArr.length * 100)}%`)
  }
  const createdDirs = new Set<string>()
  const copyTasks = [] as Array<Promise<void>>
  await Promise.all(allFilesArr.map(async ([path, file]) => {
    // ignore dot files and __MACOSX
    if (path.startsWith('.') || path.startsWith('_') || path.startsWith('/')) return
    const writePath = join(basePath, path)
    if (path.endsWith('/')) return
    const dir = dirname(writePath)
    if (!createdDirs.has(dir)) {
      await mkdirRecursive(dir)
      createdDirs.add(dir)
    }
    if (copyTasks.length > 100) {
      await Promise.all(copyTasks)
      copyTasks.length = 0
    }
    const promise = fs.promises.writeFile(writePath, Buffer.from(await file.async('arraybuffer')))
    copyTasks.push(promise)
    await promise
    done++
    upStatus()
  }))
  console.log('done')
  await completeTexturePackInstall(displayName, name)
}

// or enablement
export const completeTexturePackInstall = async (displayName: string, name: string) => {
  const basePath = texturePackBasePath2 + name
  await fs.promises.writeFile(join(basePath, 'name.txt'), displayName, 'utf8')

  if (viewer?.world.active) {
    await updateTextures()
  }
  setLoadingScreenStatus(undefined)
  showNotification('Texturepack installed & enabled')
  await updateTexturePackInstalledState()
  options.enabledResourcepack = name
}

const existsAsync = async (path) => {
  try {
    await fs.promises.stat(path)
    return true
  } catch (err) {
    return false
  }
}

const arrEqual = (a: any[], b: any[]) => a.length === b.length && a.every((x) => b.includes(x))

const getSizeFromImage = async (filePath: string) => {
  const probeImg = new Image()
  const file = await fs.promises.readFile(filePath, 'base64')
  probeImg.src = `data:image/png;base64,${file}`
  await new Promise((resolve, reject) => {
    probeImg.addEventListener('load', resolve)
  })
  if (probeImg.width !== probeImg.height) throw new Error(`Probe texture ${filePath} is not square`)
  return probeImg.width
}

export const getActiveTexturepackBasePath = async () => {
  if (await existsAsync('/data/resourcePacks/server/pack.mcmeta')) {
    return '/data/resourcePacks/server'
  }
  const { enabledResourcepack } = options
  // const enabledResourcepack = 'default'
  if (!enabledResourcepack) {
    return null
  }
  if (await existsAsync(`/data/resourcePacks/${enabledResourcepack}/pack.mcmeta`)) {
    return `/data/resourcePacks/${enabledResourcepack}`
  }
  return null
}

export const getResourcepackTiles = async (type: 'blocks' | 'items', existingTextures: string[]) => {
  const basePath = await getActiveTexturepackBasePath()
  if (!basePath) return
  let texturesBasePath = `${basePath}/assets/minecraft/textures/${type === 'blocks' ? 'block' : 'item'}`
  const texturesBasePathAlt = `${basePath}/assets/minecraft/textures/${type === 'blocks' ? 'blocks' : 'items'}`
  if (!(await existsAsync(texturesBasePath))) {
    if (await existsAsync(texturesBasePathAlt)) {
      texturesBasePath = texturesBasePathAlt
    } else {
      return
    }
  }
  const images = (await fs.promises.readdir(texturesBasePath)).filter(f => f.endsWith('.png')).map(f => f.replace('.png', ''))
  const firstImageFile = images[0]
  if (!firstImageFile) {
    return
  }
  const firstTextureSize = await getSizeFromImage(`${texturesBasePath}/${firstImageFile}.png`)
  const interestedTextureImages = images.filter(image => existingTextures.includes(image))
  if (appStatusState.status) {
    setLoadingScreenStatus(`Generating atlas texture for ${type}`)
  }
  const textures = Object.fromEntries(
    await Promise.all(interestedTextureImages.map(async (image) => {
      const imagePath = `${texturesBasePath}/${image}.png`
      const contents = await fs.promises.readFile(imagePath, 'base64')
      const img = await getLoadedImage(`data:image/png;base64,${contents}`)
      return [image, img]
    }))
  )
  return {
    firstTextureSize,
    textures
  }
}

const downloadAndUseResourcePack = async (url) => {
  console.log('downloadAndUseResourcePack', url)
}

export const onAppLoad = () => {
  customEvents.on('gameLoaded', () => {
    // todo also handle resourcePack
    bot._client.on('resource_pack_send', async (packet) => {
      if (options.serverResourcePacks === 'never') return
      const promptMessage = 'promptMessage' in packet ? JSON.stringify(packet.promptMessage) : 'Do you want to use server resource pack?'
      // TODO!
      const hash = 'hash' in packet ? packet.hash : '-'
      const forced = 'forced' in packet ? packet.forced : false
      const choice = options.serverResourcePacks === 'always'
        ? true
        : await showOptionsModal(promptMessage, ['Download & Install'], {
          cancel: !forced
        })
      if (!choice) return
      await downloadAndUseResourcePack(packet.url)
      bot.acceptResourcePack()
    })
  })
}

const setOtherTexturesCss = async () => {
  const basePath = await getActiveTexturepackBasePath()
  if (!basePath) return
  const iconsPath = `${basePath}/assets/minecraft/textures/gui/icons.png`
  const widgetsPath = `${basePath}/assets/minecraft/textures/gui/widgets.png`
  // TODO! fallback to default
  const setCustomCss = async (path, varName) => {
    if (await existsAsync(path)) {
      const contents = await fs.promises.readFile(path, 'base64')
      const dataUrl = `data:image/png;base64,${contents}`
      document.body.style.setProperty(varName, `url(${dataUrl})`)
    }
  }
  await setCustomCss(iconsPath, '--gui-icons')
  await setCustomCss(widgetsPath, '--widgets-gui-atlas')
}

const updateTextures = async () => {
  const blocksFiles = Object.keys(viewer.world.blocksAtlases.latest.textures)
  const itemsFiles = Object.keys(viewer.world.itemsAtlases.latest.textures)
  const blocksData = await getResourcepackTiles('blocks', blocksFiles)
  const itemsData = await getResourcepackTiles('items', itemsFiles)
  await setOtherTexturesCss()
  if (blocksData) {
    viewer.world.customTextures = {
      blocks: {
        tileSize: blocksData.firstTextureSize,
        textures: blocksData.textures
      }
    }
  }
  if (itemsData) {
    viewer.world.customTextures = {
      items: {
        tileSize: itemsData.firstTextureSize,
        textures: itemsData.textures
      }
    }
  }
  if (viewer.world.active) {
    await viewer.world.updateTexturesData()
  }
}

export const resourcepackOnWorldLoad = async (version) => {
  await updateTextures()
}