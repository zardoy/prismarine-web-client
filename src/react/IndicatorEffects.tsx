import { useMemo, useEffect } from 'react'
import PixelartIcon from './PixelartIcon'
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

export const defaultIndicatorsState = {
  writingFiles: false, // saving
  readonlyFiles: false,
  readingFiles: false,
  chunksLoading: false,
  appHasErrors: false,
}

const indicatorIcons: Record<keyof typeof defaultIndicatorsState, string> = {
  writingFiles: 'arrow-bar-up',
  readingFiles: 'arrow-bar-down',
  chunksLoading: 'add-grid',
  appHasErrors: 'alert',
  readonlyFiles: 'file-off',
}

export default ({ indicators, effects }: {indicators: typeof defaultIndicatorsState, effects: readonly EffectType[]}) => {

  useEffect(() => {
    const interval = setInterval(() => {
      for (const [index, effect] of effects.entries()) {
        if (effect.time === 0) {
          // effect.removeEffect(effect.image)
          return
        }
        effect.reduceTime(effect.image)
      }
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  const indicatorsMapped = Object.entries(indicators).map(([key, state]) => ({ icon: indicatorIcons[key], state }))
  return <div className='effectsScreen-container'>
    <div className='indicators-container'>
      {
        indicatorsMapped.map((indicator) => <div style={{
          opacity: indicator.state ? 1 : 0,
          transition: 'opacity 0.1s',
        }}>
          <PixelartIcon key={indicator.icon} iconName={indicator.icon} />
        </div>)
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
