import { proxy } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import { options, watchValue } from './optionsStorage'

export const currentScaling = proxy({
  scale: 1,
})
window.currentScaling = currentScaling

const setScale = () => {
  const scaleValues = [
    { maxWidth: 971, maxHeight: null, scale: 2 },
    { maxWidth: null, maxHeight: 390, scale: 1.5 }, // todo allow to set the scaling at 360-400 (dynamic scaling setting)
    { maxWidth: 590, maxHeight: null, scale: 1 },

    { maxWidth: 590, minHeight: 240, scale: 1.4 },
  ]

  const { innerWidth, innerHeight } = window

  let result = options.guiScale
  for (const { maxWidth, maxHeight, scale, minHeight } of scaleValues) {
    if ((!maxWidth || innerWidth <= maxWidth) && (!maxHeight || innerHeight <= maxHeight) && (!minHeight || innerHeight >= minHeight)) {
      result = scale
    }
  }

  currentScaling.scale = result
}


setScale()
subscribeKey(options, 'guiScale', setScale)
watchValue(currentScaling, (c) => {
  document.documentElement.style.setProperty('--guiScale', String(c.scale))
})
window.addEventListener('resize', setScale)
