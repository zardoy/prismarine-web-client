import { proxy, useSnapshot } from 'valtio'
import { proxySet } from 'valtio/utils'
import { useMemo } from 'react'
import IndicatorEffects, { IndicatorType, EffectType } from './IndicatorEffects'
import { images, imagesIdMap } from './effectsImages'



export const state = proxy({
  indicators: [] as IndicatorType[],
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

export const addInd = (newInd: Omit<IndicatorType, 'removeInd'>) => {
  const ind = { ...newInd, removeInd }
  state.indicators.push(ind)
}

const removeInd = (icon: string) => {
  for (const [index, ind] of (state.indicators).entries()) {
    if (ind.icon === icon) {
      state.indicators.splice(index, 1)
    }
  }
}

export default () => {
  const indicators = useSnapshot(state.indicators)
  const effects = useSnapshot(state.effects)

  useMemo(() => {
    bot._client.on('entity_effect', (packet) => {
      if (packet.entityId !== bot.entity.id) return
      const image = imagesIdMap[packet.effectId] ?? null
      if (!image) {
        console.error('received unknown effect id')
        return
      }
      const newEffect = {
        image,
        time: packet.duration / 20, // duration received in ticks
        level: packet.amplifier,
      }
      addEffect(newEffect)
    })
    bot._client.on('remove_entity_effect', (packet) => {
      if (packet.entityId !== bot.entity.id) return
      const image = imagesIdMap[packet.effectId] ?? null
      if (!image) {
        console.error('received unknown effect id')
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
