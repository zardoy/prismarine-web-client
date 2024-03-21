import { showNotification } from './react/NotificationProvider'

export default () => {
    localServer!.on('warpsLoaded', () => {
      showNotification(`${localServer!.warps.length} Warps loaded`, 'Use /warp <name> to teleport to a warp point.', false, 'label-alt', () => {
        // todo open warp command
      })
    })
}
