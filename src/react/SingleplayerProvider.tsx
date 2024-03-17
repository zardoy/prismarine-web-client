import fs from 'fs'
import { proxy, subscribe, useSnapshot } from 'valtio'
import { useEffect, useRef, useState } from 'react'
import { loadScript } from 'prismarine-viewer/viewer/lib/utils'
import { fsState, loadSave, longArrayToNumber, readLevelDat } from '../loadSave'
import { googleDriveGetFileIdFromPath, mountExportFolder, mountGoogleDriveFolder, removeFileRecursiveAsync } from '../browserfs'
import { hideCurrentModal, showModal } from '../globalState'
import { haveDirectoryPicker, setLoadingScreenStatus } from '../utils'
import { exportWorld } from '../builtinCommands'
import { googleProviderData, useGoogleLogIn, GoogleDriveProvider, isGoogleDriveAvailable } from '../googledrive'
import Singleplayer, { WorldProps } from './Singleplayer'
import { useIsModalActive } from './utils'
import { showOptionsModal } from './SelectOption'
import Input from './Input'
import GoogleButton from './GoogleButton'

const worldsProxy = proxy({
  value: null as null | WorldProps[],
  selectedProvider: 'local' as 'local' | 'google',
  error: '',
})

const getWorldsPath = () => {
  return worldsProxy.selectedProvider === 'local' ? `/data/worlds` : worldsProxy.selectedProvider === 'google' ? `/google/${googleProviderData.worldsPath.replace(/\/$/, '')}` : ''
}

const providersEnableFeatures = {
  local: {
    calculateSize: true,
    delete: true,
    export: true,
  },
  google: {
    calculateSize: false,
    // TODO
    delete: false,
    export: false,
  }
}

export const readWorlds = (abortController: AbortController) => {
  if (abortController.signal.aborted) return
  worldsProxy.error = '';
  (async () => {
    try {
      const loggedIn = !!googleProviderData.accessToken
      worldsProxy.value = null
      if (worldsProxy.selectedProvider === 'google' && !loggedIn) {
        worldsProxy.value = []
        return
      }
      const worldsPath = getWorldsPath()
      const provider = worldsProxy.selectedProvider

      const worlds = await fs.promises.readdir(worldsPath)

      const newMappedWorlds = (await Promise.allSettled(worlds.map(async (folder) => {
        const { levelDat } = (await readLevelDat(`${worldsPath}/${folder}`))!
        let size = 0
        if (providersEnableFeatures[provider].calculateSize) {
          // todo use whole dir size
          for (const region of await fs.promises.readdir(`${worldsPath}/${folder}/region`)) {
            const stat = await fs.promises.stat(`${worldsPath}/${folder}/region/${region}`)
            size += stat.size
          }
        }
        const levelName = levelDat.LevelName as string | undefined
        return {
          name: folder,
          title: levelName ?? folder,
          lastPlayed: levelDat.LastPlayed && longArrayToNumber(levelDat.LastPlayed),
          detail: `${levelDat.Version?.Name ?? 'unknown version'}, ${folder}`,
          size,
        } satisfies WorldProps
      }))).filter(x => {
        if (x.status === 'rejected') {
          console.warn(x.reason)
          return false
        }
        return true
      }).map(x => (x as Extract<typeof x, { value }>).value)
      if (abortController.signal.aborted) return
      worldsProxy.value = newMappedWorlds
    } catch (err) {
      if (err.name === 'AbortError') return
      console.warn(err)
      worldsProxy.value = null
      worldsProxy.error = err.message
    }
  })().catch((err) => {
    // todo it still doesn't work for some reason!
    worldsProxy.error = err.message
  })
}

export const loadInMemorySave = async (worldPath: string) => {
  fsState.saveLoaded = false
  fsState.isReadonly = false
  fsState.syncFs = false
  fsState.inMemorySave = true
  await loadSave(worldPath)
}

export default () => {
  const active = useIsModalActive('singleplayer')

  if (!active) return null

  return <GoogleDriveProvider>
    <Inner />
  </GoogleDriveProvider>
}

const Inner = () => {
  const worlds = useSnapshot(worldsProxy).value as WorldProps[] | null
  const { selectedProvider, error } = useSnapshot(worldsProxy)
  const readWorldsAbortController = useRef(new AbortController())

  // 3rd party providers
  useEffect(() => {
    if (selectedProvider !== 'google') return
    void loadScript('https://apis.google.com/js/api.js').then(async (scriptEl) => {
      if (!scriptEl) return // already loaded
      gapi.load('client', () => {
        void gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest').then(() => {
          googleProviderData.isReady = true
        })
      })
    })
  }, [selectedProvider])

  const loggedIn = !!useSnapshot(googleProviderData).accessToken
  const googleDriveReadonly = useSnapshot(googleProviderData).readonlyMode
  const { worldsPath } = useSnapshot(googleProviderData)

  useEffect(() => {
    (async () => {
      if (selectedProvider === 'google') {
        await mountGoogleDriveFolder(googleProviderData.readonlyMode)
      }
      if (selectedProvider === 'local' && !(await fs.promises.stat('/data/worlds').catch(() => false))) {
        await fs.promises.mkdir('/data/worlds')
      }
      readWorlds(readWorldsAbortController.current)
    })()

    return () => {
      readWorldsAbortController.current.abort()
      readWorldsAbortController.current = new AbortController()
    }
  }, [selectedProvider, loggedIn, worldsPath, googleDriveReadonly])

  const googleLogIn = useGoogleLogIn()

  const isGoogleProviderReady = useSnapshot(googleProviderData).isReady
  const providerActions = selectedProvider === 'google' ? isGoogleProviderReady ? loggedIn ? {
    'Log Out' () {
      googleProviderData.hasEverLoggedIn = false
      googleProviderData.accessToken = null
      // TODO revoke token
    },
    async [`Read Only: ${googleDriveReadonly ? 'ON' : 'OFF'}`] () {
      if (googleProviderData.readonlyMode) {
        const choice = await showOptionsModal('[Unstable Feature] Enabling world save might corrupt your worlds, eg remove entities (note: you can always restore previous version of files in Drive)', ['Continue'])
        if (choice !== 'Continue') return
      }
      googleProviderData.readonlyMode = !googleProviderData.readonlyMode
    },
    'Worlds Path': <Input rootStyles={{ width: 100 }} placeholder='Worlds path' defaultValue={worldsPath} onBlur={(e) => {
      googleProviderData.worldsPath = e.target.value
    }} />
  } : {
    'Log In': <GoogleButton onClick={googleLogIn} />
  } : {
    'Loading...' () { }
  } : undefined
  // end

  return <Singleplayer
    error={error}
    providers={{
      local: 'Local',
      google: 'Google Drive',
    }}
    disabledProviders={[...isGoogleDriveAvailable() ? [] : ['google']]}
    worldData={worlds}
    providerActions={providerActions}
    activeProvider={selectedProvider}
    setActiveProvider={(provider) => {
      worldsProxy.selectedProvider = provider as any
    }}
    onWorldAction={async (action, worldName) => {
      const worldPath = `${getWorldsPath()}/${worldName}`
      const openInGoogleDrive = () => {
        const fileId = googleDriveGetFileIdFromPath(worldPath.replace('/google/', ''))
        if (!fileId) return alert('File not found')
        window.open(`https://drive.google.com/drive/folders/${fileId}`)
      }

      if (action === 'load') {
        setLoadingScreenStatus(`Starting loading world ${worldName}`)
        await loadInMemorySave(worldPath)
        return
      }
      if (action === 'delete') {
        if (selectedProvider === 'google') {
          openInGoogleDrive()
          return
        }

        if (!confirm('Are you sure you want to delete current world')) return
        setLoadingScreenStatus(`Removing world ${worldName}`)
        await removeFileRecursiveAsync(worldPath)
        setLoadingScreenStatus(undefined)
        readWorlds(readWorldsAbortController.current)
      }
      if (action === 'export') {
        if (selectedProvider === 'google') {
          openInGoogleDrive()
          return
        }

        const selectedVariant =
          haveDirectoryPicker()
            ? await showOptionsModal('Select export type', ['Select folder (recommended)', 'Download ZIP file'])
            : await showOptionsModal('Select export type', ['Download ZIP file'])
        if (!selectedVariant) return
        if (selectedVariant === 'Select folder (recommended)') {
          const success = await mountExportFolder()
          if (!success) return
        }
        await exportWorld(worldPath, selectedVariant === 'Select folder (recommended)' ? 'folder' : 'zip', worldName)
      }
    }}
    onGeneralAction={(action) => {
      if (action === 'cancel') {
        hideCurrentModal()
      }
      if (action === 'create') {
        showModal({ reactType: 'create-world' })
      }
    }}
  />
}
