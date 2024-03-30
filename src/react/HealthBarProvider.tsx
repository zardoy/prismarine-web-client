import { useRef, useState, useMemo } from 'react'
import icons from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/icons.png'
import HealthBar from './HealthBar'
import './HealthBar.css'


export default (showHealth: boolean) => {
  const damaged = useRef(false)
  const healthValue = useRef(10)
  const gameMode = useRef('')
  const isHardcore = useRef(false)
  const effectToAdd = useRef<number | null>(null)
  const effectToRemove = useRef<number | null>(null)
  let hurtTimeout

  const getEffectClass = (effect) => {
    switch (effect.id) {
      case 19:
        return 'poisoned'
      case 20:
        return 'withered'
      case 22:
        return 'absorption'
      default:
        return ''
    }
  }

  const effectAdded = (htmlElement, effect) => {
    const effectClass = getEffectClass(effect)
    if (!effectClass) return
    htmlElement.classList.add(effectClass)
  }

  const effectEnded = (htmlElement, effect) => {
    const effectClass = getEffectClass(effect)
    if (!effectClass) return
    htmlElement.classList.remove(effectClass)
  }

  const onDamage = () => {
    damaged.current = true
    if (hurtTimeout) clearTimeout(hurtTimeout)
    hurtTimeout = setTimeout(() => {
      damaged.current = false
    }, 1000)
  }

  const updateHealth = (hValue) => {
    healthValue.current = hValue
  }

  useMemo(() => {
    bot.on('entityHurt', (entity) => {
      if (entity !== bot.entity) return
      onDamage()
    })

    bot.on('game', () => {
      gameMode.current = bot.game.gameMode
      isHardcore.current = bot.game.hardcore
    })

    bot.on('entityEffect', (entity, effect) => {
      if (entity !== bot.entity) return
      effectToAdd.current = effect.id
    })

    bot.on('entityEffectEnd', (entity, effect) => {
      if (entity !== bot.entity) return
      effectToRemove.current = effect.id
    })

    bot.on('health', () => {
      updateHealth(bot.health)
    })
  }, []) 

  return <HealthBar 
    gameMode={gameMode.current}
    isHardcore={isHardcore.current}
    damaged={damaged.current}
    healthValue={healthValue.current}
    effectToAdd={effectToAdd.current}
    effectToRemove={effectToRemove.current}
    effectAdded={effectAdded}
    effectEnded={effectEnded}
  />
}


