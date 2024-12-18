import * as fs from 'fs'
import path from 'path'
import { gzip } from 'node-gzip'
import * as nbt from 'prismarine-nbt'
import * as browserfs from 'browserfs'
import { nameToMcOfflineUUID } from '../flyingSquidUtils'
import { configureBrowserFs, defaultMountablePoints, localFsState, mkdirRecursive, mountRemoteFsBackend } from './browserfsShared'

const readLevelDat = async (path) => {
  let levelDatContent
  try {
    // todo-low cache reading
    levelDatContent = await fs.promises.readFile(`${path}/level.dat`)
  } catch (err) {
    if (err.code === 'ENOENT') {
      return undefined
    }
    throw err
  }
  const { parsed } = await nbt.parse(Buffer.from(levelDatContent))
  const levelDat = nbt.simplify(parsed).Data
  return { levelDat, dataRaw: parsed.value.Data!.value as Record<string, any> }
}

export const onWorldOpened = async (username: string, root: string) => {
  // const { levelDat, dataRaw } = (await readLevelDat(root))!

  // const playerUuid = nameToMcOfflineUUID(username)
  // const playerDatPath = `${root}/playerdata/${playerUuid}.dat`
  // const playerDataOverride = dataRaw.Player
  // if (playerDataOverride) {
  //   const playerDat = await gzip(nbt.writeUncompressed({ name: '', ...playerDataOverride }))
  //   if (localFsState.isReadonly) {
  //     fs forceCachedDataPaths[playerDatPath] = playerDat
  //   } else {
  //     await mkdirRecursive(path.dirname(playerDatPath))
  //     await fs.promises.writeFile(playerDatPath, playerDat)
  //   }
  // }
}

export const mountFsBackend = async () => {
  if (localFsState.remoteBackend) {
    await mountRemoteFsBackend(localFsState)
  } else if (localFsState.inMemorySave) {
    await new Promise(resolve => {
      configureBrowserFs(resolve)
    })
  }
}
