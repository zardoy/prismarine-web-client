import { PlayerAnimation } from 'skinview3d'

export class ArmSwing extends PlayerAnimation {

  switchAnimationCallback

  isRunning = false

  animate (player) {
    // Multiply by animation's natural speed
    let t = this.progress * 8
    let reset = false

    if (Math.sin(t) < 0.01) {
      if (this.switchAnimationCallback) {
        reset = true
        t = 0
      }
    }

    if (this.isRunning) {
      // Leg swing with larger amplitude
      player.skin.leftLeg.rotation.x = Math.cos(t + Math.PI) * 1.3
      player.skin.rightLeg.rotation.x = Math.cos(t) * 1.3
    } else {
      // Leg swing
      player.skin.leftLeg.rotation.x = Math.sin(t) * 0.5
      player.skin.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.5
    }

    if (this.isRunning) {
      player.skin.leftArm.rotation.x = Math.cos(t) * 1.5
      player.skin.rightArm.rotation.x = Math.cos(t + Math.PI) * 1.5
      const basicArmRotationZ = Math.PI * 0.1
      player.skin.leftArm.rotation.z = Math.cos(t) * 0.1 + basicArmRotationZ
      player.skin.rightArm.rotation.z = Math.cos(t + Math.PI) * 0.1 - basicArmRotationZ
    } else {
      // Arm swing
      player.skin.leftArm.rotation.x = Math.sin(t + Math.PI) * 0.5
      player.skin.rightArm.rotation.x = Math.sin(t) * 0.5
      const basicArmRotationZ = Math.PI * 0.02
      player.skin.leftArm.rotation.z = Math.cos(t) * 0.03 + basicArmRotationZ
      player.skin.rightArm.rotation.z = Math.cos(t + Math.PI) * 0.03 - basicArmRotationZ
    }

    if (this.isRunning) {
      player.rotation.z = Math.cos(t + Math.PI) * 0.01
    }
    if (this.isRunning) {
      const basicCapeRotationX = Math.PI * 0.3
      player.cape.rotation.x = Math.sin(t * 2) * 0.1 + basicCapeRotationX
    } else {
      // Always add an angle for cape around the x axis
      const basicCapeRotationX = Math.PI * 0.06
      player.cape.rotation.x = Math.sin(t / 1.5) * 0.06 + basicCapeRotationX
    }

    if (reset) {
      this.switchAnimationCallback()
    }
  }
}
