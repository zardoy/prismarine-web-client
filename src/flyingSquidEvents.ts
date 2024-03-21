import { showModal } from './globalState'
import { chatInputValueGlobal } from './react/ChatContainer'
import { showNotification } from './react/NotificationProvider'

export default () => {
    localServer!.on('warpsLoaded', () => {
      showNotification(`${localServer!.warps.length} Warps loaded`, 'Use /warp <name> to teleport to a warp point.', false, 'label-alt', () => {
        chatInputValueGlobal.value = '/warp '
        showModal({ reactType: 'chat' })
      })
    })
}
