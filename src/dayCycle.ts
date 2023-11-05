import { options } from './optionsStorage'
import { assertDefined } from './utils'

export default () => {
  bot.on('time', () => {
    assertDefined(viewer)
    // 0 morning
    const dayTotal = 24_000
    const evening = 12_542
    const night = 17_843
    const morningStart = 22_300
    const morningEnd = 23_961
    const timeProgress = options.dayCycleAndLighting ? bot.time.time : 0

    // todo check actual colors
    const dayColorRainy = { r: 111 / 255, g: 156 / 255, b: 236 / 255 }
    // todo yes, we should make animations (and rain)
    // eslint-disable-next-line unicorn/numeric-separators-style
    const dayColor = bot.isRaining ? dayColorRainy : { r: 0.6784313725490196, g: 0.8470588235294118, b: 0.9019607843137255 } // lightblue
    // let newColor = dayColor
    let int = 1
    if (timeProgress < evening) {
      // stay dayily
    } else if (timeProgress < night) {
      const progressNorm = timeProgress - evening
      const progressMax = night - evening
      int = 1 - progressNorm / progressMax
    } else if (timeProgress < morningStart) {
      int = 0
    } else if (timeProgress < morningEnd) {
      const progressNorm = timeProgress - morningStart
      const progressMax = night - morningEnd
      int = progressNorm / progressMax
    }
    // todo need to think wisely how to set these values & also move directional light around!
    const colorInt = Math.max(int, 0.1)
    viewer.scene.background = new THREE.Color(dayColor.r * colorInt, dayColor.g * colorInt, dayColor.b * colorInt)
    viewer.ambientLight.intensity = Math.max(int, 0.25)
    // directional light
    viewer.directionalLight.intensity = Math.min(int, 0.5)
  })
}
