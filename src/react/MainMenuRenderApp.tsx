import fs from 'fs'
import { Transition } from 'react-transition-group'
import { useSnapshot } from 'valtio'
import { useEffect } from 'react'
import { openURL } from 'prismarine-viewer/viewer/lib/simpleUtils'
import { activeModalStack, miscUiState, openOptionsMenu, showModal } from '../globalState'
import { openGithub, setLoadingScreenStatus } from '../utils'
import { openFilePicker, copyFilesAsync, mkdirRecursive, openWorldDirectory, removeFileRecursiveAsync } from '../browserfs'

import MainMenu from './MainMenu'

// todo clean
let disableAnimation = false
export default () => {
  const haveModals = useSnapshot(activeModalStack).length
  const { gameLoaded, appLoaded, appConfig } = useSnapshot(miscUiState)

  const noDisplay = haveModals || gameLoaded || !appLoaded

  useEffect(() => {
    if (noDisplay && appLoaded) disableAnimation = true
  }, [noDisplay])

  // todo clean, use custom csstransition
  return <Transition in={!noDisplay} timeout={disableAnimation ? 0 : 100} mountOnEnter unmountOnExit>
    {(state) => <div style={{ transition: state === 'exiting' || disableAnimation ? '' : '100ms opacity ease-in', ...state === 'entered' ? { opacity: 1 } : { opacity: 0 } }}>
      <MainMenu
        connectToServerAction={() => showModal({ reactType: 'serversList' })}
        singleplayerAction={async () => {
          const oldFormatSave = fs.existsSync('./world/level.dat')
          if (oldFormatSave) {
            setLoadingScreenStatus('Migrating old save, don\'t close the page')
            try {
              await mkdirRecursive('/data/worlds/local')
              await copyFilesAsync('/world/', '/data/worlds/local')
              try {
                await removeFileRecursiveAsync('/world/')
              } catch (err) {
                console.error(err)
              }
            } catch (err) {
              console.warn(err)
              alert('Failed to migrate world from localStorage')
            } finally {
              setLoadingScreenStatus(undefined)
            }
          }
          showModal({ reactType: 'singleplayer' })
        }}
        githubAction={() => openGithub()}
        optionsAction={() => openOptionsMenu('main')}
        discordAction={() => openURL('https://discord.gg/4Ucm684Fq3')}
        openFileAction={e => {
          if (!!window.showDirectoryPicker && !e.shiftKey) {
            void openWorldDirectory()
          } else {
            openFilePicker()
          }
        }}
        mapsProvider={appConfig?.mapsProvider}
      />
    </div>}
  </Transition>
}
