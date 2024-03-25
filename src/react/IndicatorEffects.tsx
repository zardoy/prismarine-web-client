import { useMemo, useEffect, useState } from 'react'
import PixelartIcon from './PixelartIcon'
import { images } from './effectsImages'
import './IndicatorEffects.css'



function formatTime (seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  const formattedMinutes = String(minutes).padStart(2, '0')
  const formattedSeconds = String(remainingSeconds).padStart(2, '0')
  return `${formattedMinutes}:${formattedSeconds}`
}

export type EffectBoxProps = {
  image: string,
  time: number,
  level: number,
  removeEffect: (image: string) => void
}

const EffectBox = ({ image, time, level, removeEffect }: EffectBoxProps) => {
  const [timer, setTimer] = useState(time)

  useEffect(() => {
    if (timer === 0) removeEffect(image)
  }, [timer])

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev - 1)
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  const formattedTime = useMemo(() => formatTime(timer), [timer])

  return <div className='effect-box'>
    <img className='effect-box__image' src={image} alt='' />
    <div>
      {timer >= 0 ? (
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
}

export default ({ indicators, effects }: {indicators: readonly IndicatorType[], effects: readonly EffectBoxProps[]}) => {
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
            removeEffect={effect.removeEffect}
          />
        )
      }
    </div>
  </div>
}
