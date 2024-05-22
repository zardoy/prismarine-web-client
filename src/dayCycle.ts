import { options } from './optionsStorage'
import { assertDefined } from './utils'
import { updateBackground } from './water'

export default () => {
  const timeUpdated = () => {
    assertDefined(viewer)
    // 0 morning
    const dayTotal = 24_000
    const evening = 11_500
    const night = 13_500
    const morningStart = 23_000
    const morningEnd = 23_961
    const timeProgress = options.dayCycleAndLighting ? bot.time.timeOfDay : 0

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
    updateBackground({ r: dayColor.r * colorInt, g: dayColor.g * colorInt, b: dayColor.b * colorInt })
    if (!options.newVersionsLighting && bot.supportFeature('blockStateId')) {
      viewer.ambientLight.intensity = Math.max(int, 0.25)
      viewer.directionalLight.intensity = Math.min(int, 0.5)
    }
  }

  bot.on('time', timeUpdated)
  timeUpdated()
}
