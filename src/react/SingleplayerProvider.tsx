import fs from 'fs'
import { proxy, useSnapshot } from 'valtio'
import { useEffect } from 'react'
import { fsState, loadSave, longArrayToNumber, readLevelDat } from '../loadSave'
import { mountExportFolder, removeFileRecursiveAsync } from '../browserfs'
import { hideCurrentModal, showModal } from '../globalState'
import { haveDirectoryPicker, setLoadingScreenStatus } from '../utils'
import { exportWorld } from '../builtinCommands'
import Singleplayer, { WorldProps } from './Singleplayer'
import { useIsModalActive } from './utils'
import { showOptionsModal } from './SelectOption'

const worldsProxy: { value: WorldProps[] } = proxy({ value: [] })

export const readWorlds = () => {
  (async () => {
    try {
      const worlds = await fs.promises.readdir(`/data/worlds`)
      worldsProxy.value = (await Promise.allSettled(worlds.map(async (folder) => {
        const { levelDat } = (await readLevelDat(`/data/worlds/${folder}`))!
        let size = 0
        // todo use whole dir size
        for (const region of await fs.promises.readdir(`/data/worlds/${folder}/region`)) {
          const stat = await fs.promises.stat(`/data/worlds/${folder}/region/${region}`)
          size += stat.size
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
    } catch (err) {
      console.warn(err)
      worldsProxy.value = []
    }
  })()
}

export const loadInMemorySave = async (worldPath: string) => {
  fsState.saveLoaded = false
  fsState.isReadonly = false
  fsState.syncFs = false
  fsState.inMemorySave = true
  await loadSave(worldPath)
}

export default () => {
  const worlds = useSnapshot(worldsProxy).value as WorldProps[]
  const active = useIsModalActive('singleplayer')

  useEffect(() => {
    if (!active) return
    readWorlds()
  }, [active])

  if (!active) return null

  return <Singleplayer
    worldData={worlds}
    onWorldAction={async (action, worldName) => {
      const worldPath = `/data/worlds/${worldName}`
      if (action === 'load') {
        await loadInMemorySave(worldPath)
        return
      }
      if (action === 'delete') {
        if (!confirm('Are you sure you want to delete current world')) return
        setLoadingScreenStatus(`Removing world ${worldName}`)
        await removeFileRecursiveAsync(worldPath)
        setLoadingScreenStatus(undefined)
        readWorlds()
      }
      if (action === 'export') {
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
