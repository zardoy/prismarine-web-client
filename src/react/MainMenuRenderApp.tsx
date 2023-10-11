import fs from 'fs'
import { useSnapshot } from 'valtio'
import { activeModalStack, miscUiState, openOptionsMenu, showModal } from '../globalState'
import { openURL } from '../menus/components/common'
import { fsState } from '../loadSave'
import { options } from '../optionsStorage'
import defaultLocalServerOptions from '../defaultLocalServerOptions'
import { openFilePicker } from '../utils'
import { openWorldDirectory } from '../browserfs'
import MainMenu from './MainMenu'

export default () => {
  const haveModals = useSnapshot(activeModalStack).length
  const { gameLoaded } = useSnapshot(miscUiState)
  if (haveModals || gameLoaded) return

  return <MainMenu
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
      window.dispatchEvent(new window.CustomEvent('singleplayer', {}))
    }}
    githubAction={() => openURL(process.env.GITHUB_URL)}
    optionsAction={() => openOptionsMenu('main')}
    discordAction={() => openURL('https://discord.gg/4Ucm684Fq3')}
    openFileAction={e => {
      if (!!window.showDirectoryPicker && !e.shiftKey) {
        openWorldDirectory()
      } else {
        openFilePicker()
      }
    }}
  />
}
