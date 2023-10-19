import fs from 'fs'
import { Transition } from 'react-transition-group'
import { useSnapshot } from 'valtio'
import { useEffect } from 'react'
import { activeModalStack, miscUiState, openOptionsMenu, showModal } from '../globalState'
import { openURL } from '../menus/components/common'
import { fsState } from '../loadSave'
import { options } from '../optionsStorage'
import defaultLocalServerOptions from '../defaultLocalServerOptions'
import { openFilePicker } from '../utils'
import { openWorldDirectory } from '../browserfs'
import MainMenu from './MainMenu'

// todo clean
let disableAnimation = false
export default () => {
  const haveModals = useSnapshot(activeModalStack).length
  const { gameLoaded, appLoaded } = useSnapshot(miscUiState)

  const noDisplay = haveModals || gameLoaded || !appLoaded

  useEffect(() => {
    if (noDisplay && appLoaded) disableAnimation = true
  }, [noDisplay])

  // todo clean, use custom csstransition
  return <Transition in={!noDisplay} timeout={disableAnimation ? 0 : 100} mountOnEnter unmountOnExit>
    {(state) => <div style={{ transition: state === 'exiting' || disableAnimation ? '' : '100ms opacity ease-in', ...state === 'entered' ? { opacity: 1 } : { opacity: 0 } }}>
      <MainMenu
        connectToServerAction={() => showModal(document.getElementById('play-screen'))}
        singleplayerAction={() => {
          fsState.isReadonly = false
          fsState.syncFs = true
          fsState.inMemorySave = true
          const notFirstTime = fs.existsSync('./world/level.dat')
          if (notFirstTime && !options.localServerOptions.version) {
            options.localServerOptions.version = '1.16.1' // legacy version
          } else {
            options.localServerOptions.version ??= defaultLocalServerOptions.version
          }
          window.dispatchEvent(new window.CustomEvent('singleplayer', {
            detail: {
              savingInterval: 0 // disable auto-saving because we use very slow sync fs
            },
          }))
        }}
        githubAction={() => openURL(process.env.GITHUB_URL)}
        optionsAction={() => openOptionsMenu('main')}
        discordAction={() => openURL('https://discord.gg/4Ucm684Fq3')}
        openFileAction={e => {
          if (!!window.showDirectoryPicker && !e.shiftKey) {
            void openWorldDirectory()
          } else {
            openFilePicker()
          }
        }}
      />
    </div>}
  </Transition>
}
