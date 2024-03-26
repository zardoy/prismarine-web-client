import { proxy, useSnapshot } from 'valtio'
import { useMemo } from 'react'
import { inGameError } from '../utils'
import IndicatorEffects, { EffectType, defaultIndicatorsState } from './IndicatorEffects'
import { imagesIdMap } from './effectsImages'


export const state = proxy({
  indicators: { ...defaultIndicatorsState },
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
  const indicators = useSnapshot(state.indicators)
  const effects = useSnapshot(state.effects)

  useMemo(() => {
    bot.on('entityEffect', (entity, effect) => {
      if (entity.id !== bot.entity.id) return
      const image = imagesIdMap[effect.id] ?? null
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
      const image = imagesIdMap[effect.id] ?? null
      if (!image) {
        inGameError(`received unknown effect id ${effect.id}}}`)
        return
      }
      removeEffect(image)
    })
  }, [])

  return <IndicatorEffects
    indicators={indicators}
    effects={effects}
  />
}
