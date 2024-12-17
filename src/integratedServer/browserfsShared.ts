import { join } from 'path'
import { promisify } from 'util'
import fs from 'fs'
import sanitizeFilename from 'sanitize-filename'
import { oneOf } from '@zardoy/utils'
import * as browserfs from 'browserfs'
import { proxy } from 'valtio'

const { GoogleDriveFileSystem } = require('google-drive-browserfs/src/backends/GoogleDrive') // disable type checking

browserfs.install(globalThis)
export const defaultMountablePoints = {
  '/world': { fs: 'LocalStorage' }, // will be removed in future
  '/data': { fs: 'IndexedDB' },
  '/resourcepack': { fs: 'InMemory' }, // temporary storage for currently loaded resource pack
} as Record<string, any>
if (typeof localStorage === 'undefined') {
  delete defaultMountablePoints['/world']
}
export const configureBrowserFs = (onDone) => {
  browserfs.configure({
    fs: 'MountableFileSystem',
    options: defaultMountablePoints,
  }, async (e) => {
    // todo disable singleplayer button
    if (e) throw e
    onDone()
  })
}

export const initialFsState = {
  isReadonly: false,
  syncFs: false,
  inMemorySave: false,
  inMemorySavePath: '',
  saveLoaded: false,

  remoteBackend: false,
  remoteBackendBaseUrl: '',
  usingIndexFileUrl: '',
  forceCachedDataPaths: {},
  forceRedirectPaths: {}
}
export const localFsState = {
  ...initialFsState
}

export const currentInternalFsState = proxy({
  openReadOperations: 0,
  openWriteOperations: 0,
  openOperations: 0,
})

globalThis.fs ??= fs
const promises = new Proxy(Object.fromEntries(['readFile', 'writeFile', 'stat', 'mkdir', 'rmdir', 'unlink', 'rename', /* 'copyFile',  */'readdir'].map(key => [key, promisify(fs[key])])), {
  get (target, p: string, receiver) {
    if (!target[p]) throw new Error(`Not implemented fs.promises.${p}`)
    return (...args) => {
      // browser fs bug: if path doesn't start with / dirname will return . which would cause infinite loop, so we need to normalize paths
      if (typeof args[0] === 'string' && !args[0].startsWith('/')) args[0] = '/' + args[0]
      const toRemap = Object.entries(localFsState.forceRedirectPaths).find(([from]) => args[0].startsWith(from))
      if (toRemap) {
        args[0] = args[0].replace(toRemap[0], toRemap[1])
      }
      // Write methods
      // todo issue one-time warning (in chat I guess)
      const readonly = localFsState.isReadonly && !(args[0].startsWith('/data') && !localFsState.inMemorySave) // allow copying worlds from external providers such as zip
      if (readonly) {
        if (oneOf(p, 'readFile', 'writeFile') && localFsState.forceCachedDataPaths[args[0]]) {
          if (p === 'readFile') {
            return Promise.resolve(localFsState.forceCachedDataPaths[args[0]])
          } else if (p === 'writeFile') {
            localFsState.forceCachedDataPaths[args[0]] = args[1]
            console.debug('Skipped writing to readonly fs', args[0])
            return Promise.resolve()
          }
        }
        if (oneOf(p, 'writeFile', 'mkdir', 'rename')) return
      }
      if (p === 'open' && localFsState.isReadonly) {
        args[1] = 'r' // read-only, zipfs throw otherwise
      }
      if (p === 'readFile') {
        currentInternalFsState.openReadOperations++
      } else if (p === 'writeFile') {
        currentInternalFsState.openWriteOperations++
      }
      return target[p](...args).finally(() => {
        if (p === 'readFile') {
          currentInternalFsState.openReadOperations--
        } else if (p === 'writeFile') {
          currentInternalFsState.openWriteOperations--
        }
      })
    }
  }
})
promises.open = async (...args) => {
  //@ts-expect-error
  const fd = await promisify(fs.open)(...args)
  return {
    ...Object.fromEntries(['read', 'write', 'close'].map(x => [x, async (...args) => {
      return new Promise(resolve => {
        // todo it results in world corruption on interactions eg block placements
        if (x === 'write' && localFsState.isReadonly) {
          resolve({ buffer: Buffer.from([]), bytesRead: 0 })
          return
        }

        if (x === 'read') {
          currentInternalFsState.openReadOperations++
        } else if (x === 'write' || x === 'close') {
          currentInternalFsState.openWriteOperations++
        }
        fs[x](fd, ...args, (err, bytesRead, buffer) => {
          if (x === 'read') {
            currentInternalFsState.openReadOperations--
          } else if (x === 'write' || x === 'close') {
            // todo that's not correct
            currentInternalFsState.openWriteOperations--
          }
          if (err) throw err
          // todo if readonly probably there is no need to open at all (return some mocked version - check reload)?
          if (x === 'write' && !localFsState.isReadonly) {
            // flush data, though alternatively we can rely on close in unload
            fs.fsync(fd, () => { })
          }
          resolve({ buffer, bytesRead })
        })
      })
    }])),
    // for debugging
    fd,
    filename: args[0],
    async close () {
      return new Promise<void>(resolve => {
        fs.close(fd, (err) => {
          if (err) {
            throw err
          } else {
            resolve()
          }
        })
      })
    }
  }
}
globalThis.promises = promises
if (typeof localStorage !== 'undefined') {
  //@ts-expect-error
  fs.promises = promises
}

// for testing purposes, todo move it to core patch
const removeFileRecursiveSync = (path) => {
  for (const file of fs.readdirSync(path)) {
    const curPath = join(path, file)
    if (fs.lstatSync(curPath).isDirectory()) {
      // recurse
      removeFileRecursiveSync(curPath)
      fs.rmdirSync(curPath)
    } else {
      // delete file
      fs.unlinkSync(curPath)
    }
  }
}

globalThis.removeFileRecursiveSync = removeFileRecursiveSync

export const mkdirRecursive = async (path: string) => {
  const parts = path.split('/')
  let current = ''
  for (const part of parts) {
    current += part + '/'
    try {
      // eslint-disable-next-line no-await-in-loop
      await fs.promises.mkdir(current)
    } catch (err) {
    }
  }
}

export const mountRemoteFsBackend = async (fsState: typeof localFsState) => {
  const index = await fetch(fsState.usingIndexFileUrl).then(async (res) => res.json())
  await new Promise<void>(async resolve => {
    browserfs.configure({
      fs: 'MountableFileSystem',
      options: {
        ...defaultMountablePoints,
        '/world': {
          fs: 'HTTPRequest',
          options: {
            index,
            baseUrl: fsState.remoteBackendBaseUrl
          }
        }
      },
    }, (e) => {
      if (e) throw e
      resolve()
    })
  })
}

export const uniqueFileNameFromWorldName = async (title: string, savePath: string) => {
  const name = sanitizeFilename(title)
  let resultPath!: string
  // getUniqueFolderName
  let i = 0
  let free = false
  while (!free) {
    try {
      resultPath = `${savePath.replace(/\$/, '')}/${name}${i === 0 ? '' : `-${i}`}`
      // eslint-disable-next-line no-await-in-loop
      await fs.promises.stat(resultPath)
      i++
    } catch (err) {
      free = true
    }
  }
  return resultPath
}

export const mountExportFolder = async () => {
  let handle: FileSystemDirectoryHandle
  try {
    handle = await showDirectoryPicker({
      id: 'world-export',
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    throw err
  }
  if (!handle) return false
  await new Promise<void>(resolve => {
    browserfs.configure({
      fs: 'MountableFileSystem',
      options: {
        ...defaultMountablePoints,
        '/export': {
          fs: 'FileSystemAccess',
          options: {
            handle
          }
        }
      },
    }, (e) => {
      if (e) throw e
      resolve()
    })
  })
  return true
}

let googleDriveFileSystem

/** Only cached! */
export const googleDriveGetFileIdFromPath = (path: string) => {
  return googleDriveFileSystem._getExistingFileId(path)
}

export const mountGoogleDriveFolder = async (readonly: boolean, rootId: string) => {
  throw new Error('Google drive is not supported anymore')
  //   googleDriveFileSystem = new GoogleDriveFileSystem()
  //   googleDriveFileSystem.rootDirId = rootId
  //   googleDriveFileSystem.isReadonly = readonly
  //   await new Promise<void>(resolve => {
  //     browserfs.configure({
  //       fs: 'MountableFileSystem',
  //       options: {
  //         ...defaultMountablePoints,
  //         '/google': googleDriveFileSystem
  //       },
  //     }, (e) => {
  //       if (e) throw e
  //       resolve()
  //     })
  //   })
  //   localFsState.isReadonly = readonly
  //   localFsState.syncFs = false
  //   localFsState.inMemorySave = false
  //   localFsState.remoteBackend = true
  //   return true
}

export async function removeFileRecursiveAsync (path) {
  const errors = [] as Array<[string, Error]>
  try {
    const files = await fs.promises.readdir(path)

    // Use Promise.all to parallelize file/directory removal
    await Promise.all(files.map(async (file) => {
      const curPath = join(path, file)
      const stats = await fs.promises.stat(curPath)
      if (stats.isDirectory()) {
        // Recurse
        await removeFileRecursiveAsync(curPath)
      } else {
        // Delete file
        await fs.promises.unlink(curPath)
      }
    }))

    // After removing all files/directories, remove the current directory
    await fs.promises.rmdir(path)
  } catch (error) {
    errors.push([path, error])
  }

  if (errors.length) {
    setTimeout(() => {
      console.error(errors)
      throw new Error(`Error removing directories/files: ${errors.map(([path, err]) => `${path}: ${err.message}`).join(', ')}`)
    })
  }
}


export const possiblyCleanHandle = (callback = () => { }) => {
  if (!localFsState.saveLoaded) {
    // todo clean handle
    browserfs.configure({
      fs: 'MountableFileSystem',
      options: defaultMountablePoints,
    }, (e) => {
      callback()
      if (e) throw e
    })
  }
}

const readdirSafe = async (path: string) => {
  try {
    return await fs.promises.readdir(path)
  } catch (err) {
    return null
  }
}

export const collectFilesToCopy = async (basePath: string, safe = false): Promise<string[]> => {
  const result: string[] = []
  const countFiles = async (relPath: string) => {
    const resolvedPath = join(basePath, relPath)
    const files = relPath === '.' && !safe ? await fs.promises.readdir(resolvedPath) : await readdirSafe(resolvedPath)
    if (!files) return null
    await Promise.all(files.map(async file => {
      const res = await countFiles(join(relPath, file))
      if (res === null) {
        // is file
        result.push(join(relPath, file))
      }
    }))
  }
  await countFiles('.')
  return result
}

export const existsViaStats = async (path: string) => {
  try {
    return await fs.promises.stat(path)
  } catch (e) {
    return false
  }
}

export const fileExistsAsyncOptimized = async (path: string) => {
  try {
    await fs.promises.readdir(path)
  } catch (err) {
    if (err.code === 'ENOTDIR') return true
    // eslint-disable-next-line sonarjs/prefer-single-boolean-return
    if (err.code === 'ENOENT') return false
    // throw err
    return false
  }
  return true
}

export const copyFilesAsync = async (pathSrc: string, pathDest: string, fileCopied?: (name) => void) => {
  // query: can't use fs.copy! use fs.promises.writeFile and readFile
  const files = await fs.promises.readdir(pathSrc)

  if (!await existsViaStats(pathDest)) {
    await fs.promises.mkdir(pathDest, { recursive: true })
  }

  // Use Promise.all to parallelize file/directory copying
  await Promise.all(files.map(async (file) => {
    const curPathSrc = join(pathSrc, file)
    const curPathDest = join(pathDest, file)
    const stats = await fs.promises.stat(curPathSrc)
    if (stats.isDirectory()) {
      // Recurse
      await fs.promises.mkdir(curPathDest)
      await copyFilesAsync(curPathSrc, curPathDest, fileCopied)
    } else {
      // Copy file
      try {
        await fs.promises.writeFile(curPathDest, await fs.promises.readFile(curPathSrc) as any)
        console.debug('copied file', curPathSrc, curPathDest)
      } catch (err) {
        console.error('Error copying file', curPathSrc, curPathDest, err)
        throw err
      }
      fileCopied?.(curPathDest)
    }
  }))
}
