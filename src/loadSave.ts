import fs from 'fs'
import { supportedVersions } from 'flying-squid/src/lib/version'
import * as nbt from 'prismarine-nbt'
import { proxy } from 'valtio'
import { gzip } from 'node-gzip'
import { options } from './optionsStorage'
import { nameToMcOfflineUUID } from './flyingSquidUtils'
import { forceCachedDataPaths } from './browserfs'
import { disconnect, isMajorVersionGreater } from './utils'
import { activeModalStack, activeModalStacks, hideModal, insertActiveModalStack, miscUiState } from './globalState'
import { appStatusState } from './react/AppStatusProvider'

// todo include name of opened handle (zip)!
// additional fs metadata
export const fsState = proxy({
  isReadonly: false,
  syncFs: false,
  inMemorySave: false,
  saveLoaded: false
})

const PROPOSE_BACKUP = true

export function longArrayToNumber (longArray: number[]) {
  const [high, low] = longArray
  return (high << 32) + low
}

export const readLevelDat = async (path) => {
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
  const levelDat: import('./mcTypes').LevelDat = nbt.simplify(parsed).Data
  return { levelDat, dataRaw: parsed.value.Data!.value as Record<string, any> }
}

export const loadSave = async (root = '/world') => {
  const disablePrompts = options.disableLoadPrompts

  // todo do it in singleplayer as well
  // eslint-disable-next-line guard-for-in
  for (const key in forceCachedDataPaths) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete forceCachedDataPaths[key]
  }
  // todo check jsHeapSizeLimit

  const warnings: string[] = []
  const { levelDat, dataRaw } = (await readLevelDat(root))!
  if (levelDat === undefined) {
    if (fsState.isReadonly) {
      throw new Error('level.dat not found, ensure you are loading world folder')
    } else {
      warnings.push('level.dat not found, world in current folder will be created')
    }
  }

  let version: string | undefined | null
  let isFlat = false
  if (levelDat) {
    const qs = new URLSearchParams(window.location.search)
    version = qs.get('mapVersion') ?? levelDat.Version?.Name
    if (!version) {
      const newVersion = disablePrompts ? '1.8.8' : prompt(`In 1.8 and before world save doesn't contain version info, please enter version you want to use to load the world.\nSupported versions ${supportedVersions.join(', ')}`, '1.8.8')
      if (!newVersion) return
      version = newVersion
    }
    const lastSupportedVersion = supportedVersions.at(-1)!
    const firstSupportedVersion = supportedVersions[0]
    const lowerBound = isMajorVersionGreater(firstSupportedVersion, version)
    const upperBound = isMajorVersionGreater(version, lastSupportedVersion)
    if (lowerBound || upperBound) {
      version = prompt(`Version ${version} is not supported, supported versions are ${supportedVersions.join(', ')}, what try to use instead?`, lowerBound ? firstSupportedVersion : lastSupportedVersion)
      if (!version) return
    }
    if (levelDat.WorldGenSettings) {
      for (const [key, value] of Object.entries(levelDat.WorldGenSettings.dimensions)) {
        if (key.slice(10) === 'overworld') {
          if (value.generator.type === 'flat') isFlat = true
          break
        }
      }
    }

    if (levelDat.generatorName) {
      isFlat = levelDat.generatorName === 'flat'
    }
    if (!isFlat && levelDat.generatorName !== 'default' && levelDat.generatorName !== 'customized') {
      warnings.push(`Generator ${levelDat.generatorName} may not be supported yet`)
    }

    const playerUuid = nameToMcOfflineUUID(options.localUsername)
    const playerDatPath = `${root}/playerdata/${playerUuid}.dat`
    const playerDataOverride = dataRaw.Player
    if (playerDataOverride) {
      const playerDat = await gzip(nbt.writeUncompressed({ name: '', ...playerDataOverride }))
      if (fsState.isReadonly) {
        forceCachedDataPaths[playerDatPath] = playerDat
      } else {
        await fs.promises.writeFile(playerDatPath, playerDat)
      }
    }
  }

  if (warnings.length && !disablePrompts) {
    const doContinue = confirm(`Continue with following warnings?\n${warnings.join('\n')}`)
    if (!doContinue) return
  }

  if (PROPOSE_BACKUP) {
    // const doBackup = options.alwaysBackupWorldBeforeLoading ?? confirm('Do you want to backup your world files before loading it?')
    // // const doBackup = true
    // if (doBackup) {
    //   // todo do it in flying squid instead
    //   await fs.promises.copyFile('/world/level.dat', `/world/level.dat_old`)
    //   try {
    //     await fs.promises.mkdir('/backups/region.old', { recursive: true })
    //   } catch (err) { }
    //   const files = await fs.promises.readdir('/world/region')
    //   for (const file of files) {
    //     await fs.promises.copyFile(`/world/region/${file}`, `/world/region.old/${file}`)
    //   }
    // }
  }

  if (!fsState.isReadonly && !fsState.inMemorySave && !disablePrompts) {
    // todo allow also to ctrl+s
    alert('Note: the world is saved only on /save or disconnect! Ensure you have backup!')
  }

  // todo fix these
  if (miscUiState.gameLoaded) {
    await disconnect()
  }
  // todo reimplement
  if (activeModalStacks['main-menu']) {
    insertActiveModalStack('main-menu')
  }
  // todo use general logic
  // if (activeModalStack.at(-1)?.reactType === 'app-status' && !appStatusState.isError) {
  //   alert('Wait for operations to finish before loading a new world')
  //   return
  // }
  // for (const _i of activeModalStack) {
  //   hideModal(undefined, undefined, { force: true })
  // }

  fsState.saveLoaded = true
  window.dispatchEvent(new CustomEvent('singleplayer', {
    // todo check gamemode level.dat data etc
    detail: {
      version,
      ...isFlat ? {
        generation: {
          name: 'superflat'
        }
      } : {},
      ...root === '/world' ? {} : {
        'worldFolder': root
      }
    },
  }))
}
