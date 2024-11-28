import { proxy, useSnapshot } from 'valtio'
import { useEffect, useMemo } from 'react'
import { inGameError } from '../utils'
import { fsState } from '../loadSave'
import { miscUiState } from '../globalState'
import { options } from '../optionsStorage'
import IndicatorEffects, { EffectType, defaultIndicatorsState } from './IndicatorEffects'
import { images } from './effectsImages'

export const state = proxy({
  indicators: {
    chunksLoading: false
  },
  effects: [] as EffectType[]
})

export const addEffect = (newEffect: Omit<EffectType, 'reduceTime' | 'removeEffect'>) => {
  const effectIndex = getEffectIndex(newEffect as EffectType)
  if (typeof effectIndex === 'number') {
    state.effects[effectIndex].time = newEffect.time
    state.effects[effectIndex].level = newEffect.level
  } else {
    const effect = { ...newEffect, reduceTime, removeEffect }
    state.effects.push(effect)
  }
}

const removeEffect = (image: string) => {
  for (const [index, effect] of (state.effects).entries()) {
    if (effect.image === image) {
      state.effects.splice(index, 1)
    }
  }
}

const reduceTime = (image: string) => {
  for (const [index, effect] of (state.effects).entries()) {
    if (effect.image === image) {
      effect.time -= 1
    }
  }
}

const getEffectIndex = (newEffect: EffectType) => {
  for (const [index, effect] of (state.effects).entries()) {
    if (effect.image === newEffect.image) {
      return index
    }
  }
  return null
}

export default () => {
  const stateIndicators = useSnapshot(state.indicators)
  const { hasErrors } = useSnapshot(miscUiState)
  const { disabledUiParts } = useSnapshot(options)
  const { isReadonly, openReadOperations, openWriteOperations } = useSnapshot(fsState)
  const allIndicators: typeof defaultIndicatorsState = {
    readonlyFiles: isReadonly,
    writingFiles: openWriteOperations > 0,
    readingFiles: openReadOperations > 0,
    appHasErrors: hasErrors,
    ...stateIndicators,
  }

  useEffect(() => {
    let alreadyWaiting = false
    const listener = () => {
      if (alreadyWaiting) return
      state.indicators.chunksLoading = true
      alreadyWaiting = true
      void viewer.waitForChunksToRender().then(() => {
        state.indicators.chunksLoading = false
        alreadyWaiting = false
      })
    }
    viewer.world.renderUpdateEmitter.on('dirty', listener)

    return () => {
      viewer.world.renderUpdateEmitter.off('dirty', listener)
    }
  }, [])

  const effects = useSnapshot(state.effects)

  useMemo(() => {
    const effectsImages = Object.fromEntries(loadedData.effectsArray.map((effect) => {
      const nameKebab = effect.name.replaceAll(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).slice(1)
      return [effect.id, images[nameKebab]]
    }))
    bot.on('entityEffect', (entity, effect) => {
      if (entity.id !== bot.entity.id) return
      const image = effectsImages[effect.id] ?? null
      if (!image) {
        inGameError(`received unknown effect id ${effect.id}}`)
        return
      }
      const newEffect = {
        image,
        time: effect.duration / 20, // duration received in ticks
        level: effect.amplifier,
      }
      addEffect(newEffect)
    })
    bot.on('entityEffectEnd', (entity, effect) => {
      if (entity.id !== bot.entity.id) return
      const image = effectsImages[effect.id] ?? null
      if (!image) {
        inGameError(`received unknown effect id ${effect.id}}}`)
        return
      }
      removeEffect(image)
    })
  }, [])

  return <IndicatorEffects
    indicators={allIndicators}
    effects={effects}
  />
}
