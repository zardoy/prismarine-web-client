import { PlayerAnimation } from 'skinview3d'

export class WalkingGeneralSwing extends PlayerAnimation {

  switchAnimationCallback

  isRunning = false
  isMoving = true

  _startArmSwing

  swingArm() {
    this._startArmSwing = this.progress
  }

  animate(player) {
    // Multiply by animation's natural speed
    let t
    const updateT = () => {
      if (!this.isMoving) {
        t = 0
        return
      }
      if (this.isRunning) {
        t = this.progress * 10 + Math.PI * 0.5
      } else {
        t = this.progress * 8
      }
    }
    updateT()
    let reset = false

    if ((this.isRunning ? Math.cos(t) : Math.sin(t)) < 0.01) {
      if (this.switchAnimationCallback) {
        reset = true
        this.progress = 0
        updateT()
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

    if (this._startArmSwing) {
      const tHand = (this.progress - this._startArmSwing) * 18 + Math.PI * 0.5
      player.skin.rightArm.rotation.x = Math.cos(tHand) * 1.5
      const basicArmRotationZ = Math.PI * 0.1
      player.skin.rightArm.rotation.z = Math.cos(t + Math.PI) * 0.3 - basicArmRotationZ

      if (tHand > Math.PI + Math.PI * 0.5) {
        this._startArmSwing = null
        player.skin.rightArm.rotation.z = 0
      }
    }

    if (this.isRunning) {
      player.skin.leftArm.rotation.x = Math.cos(t) * 1.5
      if (!this._startArmSwing) {
        player.skin.rightArm.rotation.x = Math.cos(t + Math.PI) * 1.5
      }
      const basicArmRotationZ = Math.PI * 0.1
      player.skin.leftArm.rotation.z = Math.cos(t) * 0.1 + basicArmRotationZ
      if (!this._startArmSwing) {
        player.skin.rightArm.rotation.z = Math.cos(t + Math.PI) * 0.1 - basicArmRotationZ
      }
    } else {
      // Arm swing
      player.skin.leftArm.rotation.x = Math.sin(t + Math.PI) * 0.5
      if (!this._startArmSwing) {
        player.skin.rightArm.rotation.x = Math.sin(t) * 0.5
      }
      const basicArmRotationZ = Math.PI * 0.02
      player.skin.leftArm.rotation.z = Math.cos(t) * 0.03 + basicArmRotationZ
      if (!this._startArmSwing) {
        player.skin.rightArm.rotation.z = Math.cos(t + Math.PI) * 0.03 - basicArmRotationZ
      }
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
      this.switchAnimationCallback = null
    }
  }
}
