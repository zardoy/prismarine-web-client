import { useMemo, useEffect, useState } from 'react'
import PixelartIcon from './PixelartIcon'
import { images } from './effectsImages'
import './IndicatorEffects.css'



function formatTime (seconds: number): string {
  if (seconds < 0) return ''
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  const formattedMinutes = String(minutes).padStart(2, '0')
  const formattedSeconds = String(remainingSeconds).padStart(2, '0')
  return `${formattedMinutes}:${formattedSeconds}`
}

export type EffectType = {
  image: string,
  time: number,
  level: number,
  removeEffect: (image: string) => void,
  reduceTime: (image: string) => void
}

const EffectBox = ({ image, time, level }: Pick<EffectType, 'image' | 'time' | 'level'>) => {

  const formattedTime = useMemo(() => formatTime(time), [time])

  return <div className='effect-box'>
    <img className='effect-box__image' src={image} alt='' />
    <div>
      {formattedTime ? (
        // if time is negative then effect is shown without time. 
        // Component should be removed manually with time = 0
        <div className='effect-box__time'>{formattedTime}</div>
      ) : null }
      {level > 0 && level < 256 ? (
        <div className='effect-box__level'>{level + 1}</div>
      ) : null }
    </div>
  </div>
}

export type IndicatorType = {
  icon: string,
  removeInd: (iconName: string) => void
}

export default ({ indicators, effects }: {indicators: readonly IndicatorType[], effects: readonly EffectType[]}) => {

  useEffect(() => {
    const timeout = setTimeout(() => {
      for (const [index, effect] of effects.entries()) {
        if (effect.time === 0) {
          effect.removeEffect(effect.image)
        } else {
          effect.reduceTime(effect.image)
        }
      }
    }, 1000)

    return () => {
      clearTimeout(timeout)
    }
  }, [effects])

  return <div className='effectsScreen-container'>
    <div className='indicators-container'>
      {
        indicators.map((indicator, index) => <PixelartIcon key={`indicator-${index}`} iconName={indicator.icon} />)
      }
    </div>
    <div className='effects-container'>
      {
        effects.map(
          (effect, index) => <EffectBox 
            key={`effectBox-${index}`} 
            image={effect.image} 
            time={effect.time} 
            level={effect.level} 
          />
        )
      }
    </div>
  </div>
}
