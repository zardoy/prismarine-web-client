import { saveServer } from './flyingSquidUtils'
import { watchUnloadForCleanup } from './gameUnload'
import { showModal } from './globalState'
import { options } from './optionsStorage'
import { chatInputValueGlobal } from './react/Chat'
import { showNotification } from './react/NotificationProvider'

export default () => {
  localServer!.on('warpsLoaded', () => {
    if (!localServer) return
    showNotification(`${localServer.warps.length} Warps loaded`, 'Use /warp <name> to teleport to a warp point.', false, 'label-alt', () => {
      chatInputValueGlobal.value = '/warp '
      showModal({ reactType: 'chat' })
    })
  })

  if (options.singleplayerAutoSave) {
    const autoSaveInterval = setInterval(() => {
      if (options.singleplayerAutoSave) {
        void saveServer(true)
      }
    }, 2000)
    watchUnloadForCleanup(() => {
      clearInterval(autoSaveInterval)
    })
  }
}
