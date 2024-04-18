import { proxy } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import { options } from './optionsStorage'

export const currentScaling = proxy({
  scale: 1,
})

const setScale = () => {
  const scaleValues = [
    { width: 971, height: 670, scale: 2 },
    { width: null, height: 430, scale: 1.5 },
    { width: 590, height: null, scale: 1 }
  ]

  const { innerWidth, innerHeight } = window

  let result = options.guiScale
  for (const { width, height, scale } of scaleValues) {
    if ((width && innerWidth <= width) || (height && innerHeight <= height)) {
      result = scale
    }
  }

  currentScaling.scale = result
  document.documentElement.style.setProperty('--guiScale', String(result))
}

setScale()
subscribeKey(options, 'guiScale', setScale)
window.addEventListener('resize', setScale)
