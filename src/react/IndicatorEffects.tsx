import { useMemo, useEffect, useRef } from 'react'
import PixelartIcon from './PixelartIcon'
import './IndicatorEffects.css'



function formatTime (seconds: number): string {
  if (seconds < 0) return ''
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  const formattedMinutes = String(minutes).padStart(2, '0')
  const formattedSeconds = String(remainingSeconds)
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
      ) : null}
      {level > 0 && level < 256 ? (
        <div className='effect-box__level'>{level + 1}</div>
      ) : null}
    </div>
  </div>
}

export const defaultIndicatorsState = {
  chunksLoading: false,
  readingFiles: false,
  readonlyFiles: false,
  writingFiles: false, // saving
  appHasErrors: false,
}

const indicatorIcons: Record<keyof typeof defaultIndicatorsState, string> = {
  chunksLoading: 'add-grid',
  readingFiles: 'arrow-bar-down',
  writingFiles: 'arrow-bar-up',
  appHasErrors: 'alert',
  readonlyFiles: 'file-off',
}

export default ({ indicators, effects }: { indicators: typeof defaultIndicatorsState, effects: readonly EffectType[] }) => {
  const effectsRef = useRef(effects)
  useEffect(() => {
    effectsRef.current = effects
  }, [effects])

  useEffect(() => {
    // todo use more precise timer for each effect
    const interval = setInterval(() => {
      for (const [index, effect] of effectsRef.current.entries()) {
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

  const indicatorsMapped = Object.entries(defaultIndicatorsState).map(([key, state]) => ({
    icon: indicatorIcons[key],
    // preserve order
    state: indicators[key],
  }))
  return <div className='effectsScreen-container'>
    <div className='indicators-container'>
      {
        indicatorsMapped.map((indicator) => <div
          key={indicator.icon} style={{
            opacity: indicator.state ? 1 : 0,
            transition: 'opacity 0.1s',
          }}
        >
          <PixelartIcon iconName={indicator.icon} />
        </div>)
      }
    </div>
    <div className='effects-container'>
      {
        effects.map((effect) => <EffectBox
          key={`effectBox-${effect.image}`}
          image={effect.image}
          time={effect.time}
          level={effect.level}
        />)
      }
    </div>
  </div>
}
