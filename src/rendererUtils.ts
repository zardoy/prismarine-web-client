import { subscribeKey } from 'valtio/utils'
import { gameAdditionalState } from './globalState'
import { options } from './optionsStorage'

export const watchFov = () => {
  const updateFov = () => {
    if (!bot) return
    let fov = gameAdditionalState.isZooming ? 30 : options.fov
    // todo check values and add transition
    if (bot.controlState.sprint && !bot.controlState.sneak) {
      fov -= 5
    }
    if (gameAdditionalState.isFlying) {
      fov -= 5
    }
    viewer.camera.fov = fov
    viewer.camera.updateProjectionMatrix()
  }
  updateFov()
  subscribeKey(options, 'fov', updateFov)
  subscribeKey(gameAdditionalState, 'isFlying', updateFov)
  subscribeKey(gameAdditionalState, 'isSprinting', updateFov)
  subscribeKey(gameAdditionalState, 'isZooming', updateFov)
  subscribeKey(gameAdditionalState, 'isSneaking', () => {
    viewer.isSneaking = gameAdditionalState.isSneaking
    viewer.setFirstPersonCamera(bot.entity.position, bot.entity.yaw, bot.entity.pitch)
  })
}
