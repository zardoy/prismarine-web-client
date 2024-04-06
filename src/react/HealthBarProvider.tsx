import { useRef, useState, useMemo } from 'react'
import { GameMode } from 'mineflayer'
import icons from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/icons.png'
import HealthBar from './HealthBar'
import FoodBar from './FoodBar'
import BreathBar from './BreathBar'
import './HealthBar.css'

export default () => {
  const [damaged, setDamaged] = useState(false)
<<<<<<< HEAD
  const [healthValue, setHealthValue] = useState(10)
  const [food, setFood] = useState(10)
  const [oxygen, setOxygen] = useState(0)
  const [gameMode, setGameMode] = useState<GameMode | ''>('')
=======
  const [healthValue, setHealthValue] = useState(20)
  const [food, setFood] = useState(20)
  const [oxygen, setOxygen] = useState(20)
  const [gameMode, setGameMode] = useState('')
>>>>>>> 42072eb (default values in health provider to 20)
  const [isHardcore, setIsHardcore] = useState(false)
  const [effectToAdd, setEffectToAdd] = useState<number | null>(null)
  const [effectToRemove, setEffectToRemove] = useState<number | null>(null)
  const hurtTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getEffectClass = (effect) => {
    switch (effect) {
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
    if (effectClass) {
      htmlElement.classList.add(effectClass)
    }
    setEffectToAdd(null)
  }

  const effectEnded = (htmlElement, effect) => {
    const effectClass = getEffectClass(effect)
    if (effectClass) {
      htmlElement.classList.remove(effectClass)
    }
    setEffectToRemove(null)
  }

  const onDamage = () => {
    setDamaged(prev => true)
    if (hurtTimeout.current) clearTimeout(hurtTimeout.current)
    hurtTimeout.current = setTimeout(() => {
      setDamaged(prev => false)
    }, 1000)
  }

  const updateHealth = (hValue) => {
    setHealthValue(prev => hValue)
  }

  useMemo(() => {
    bot.on('entityHurt', (entity) => {
      if (entity !== bot.entity) return
      onDamage()
    })

    bot.on('game', () => {
      setGameMode(prev => bot.game.gameMode)
      setIsHardcore(prev => bot.game.hardcore)
    })

    bot.on('entityEffect', (entity, effect) => {
      if (entity !== bot.entity) return
      setEffectToAdd(prev => effect.id)
    })

    bot.on('entityEffectEnd', (entity, effect) => {
      if (entity !== bot.entity) return
      setEffectToRemove(prev => effect.id)
    })

    bot.on('health', () => {
      updateHealth(bot.health)
      setFood(prev => bot.food)
    })

    bot.on('breath', () => {
      setOxygen(prev => bot.oxygenLevel)
    })
  }, [])

  return <div style={{
    //@ts-expect-error
    '--gui-icons': `url(${icons})`
  }}>
    <HealthBar
      gameMode={gameMode}
      isHardcore={isHardcore}
      damaged={damaged}
      healthValue={healthValue}
      effectToAdd={effectToAdd}
      effectToRemove={effectToRemove}
      effectAdded={effectAdded}
      effectEnded={effectEnded}
    />
    <FoodBar
      gameMode={gameMode}
      food={food}
      effectToAdd={effectToAdd}
      effectToRemove={effectToRemove}
      effectAdded={effectAdded}
      effectEnded={effectEnded}
    />
    <BreathBar
      oxygen={gameMode !== 'survival' && gameMode !== 'adventure' ? 0 : oxygen}
    />
  </div>
}
