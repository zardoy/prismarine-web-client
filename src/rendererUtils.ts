import { subscribeKey } from 'valtio/utils'
import { gameAdditionalState } from './globalState'
import { options } from './optionsStorage'

export const watchFov = () => {
  const updateFov = () => {
    if (!bot) return
    let fovSetting = options.fov
    // todo check values and add transition
    if (bot.controlState.sprint && !bot.controlState.sneak) {
      fovSetting += 5
    }
    if (gameAdditionalState.isFlying) {
      fovSetting += 5
    }
    viewer.camera.fov = fovSetting
    viewer.camera.updateProjectionMatrix()
  }
  updateFov()
  subscribeKey(options, 'fov', updateFov)
  subscribeKey(gameAdditionalState, 'isFlying', updateFov)
  subscribeKey(gameAdditionalState, 'isSprinting', updateFov)
  subscribeKey(gameAdditionalState, 'isSneaking', () => {
    viewer.isSneaking = gameAdditionalState.isSneaking
    viewer.setFirstPersonCamera(bot.entity.position, bot.entity.yaw, bot.entity.pitch)
  })
}
