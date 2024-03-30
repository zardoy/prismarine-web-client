import { useRef, useState, useEffect } from 'react'
import icons from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/icons.png'
import './HealthBar.css'


export type HealthBarProps = {
  gameMode: string,
  isHardcore: boolean,
  damaged: boolean,
  healthValue: number,
  effectToAdd: number | null,
  effectToRemove: number | null,
  effectAdded: (htmlElement: HTMLDivElement | null, effect: number | null) => void,
  effectEnded: (htmlElement: HTMLDivElement | null, effect: number | null) => void,

}

export default (
  {
    gameMode, 
    isHardcore, 
    damaged, 
    healthValue, 
    effectToAdd,
    effectToRemove,
    effectAdded,
    effectEnded
  }: HealthBarProps) => {
  const healthRef = useRef<HTMLDivElement | null>(null)
  const [className, setClassName] = useState('')
  const [effectsList, setEffectsList] = useState<string[]>([])

  useEffect(() => {
    if (gameMode === 'creative' || gameMode === 'spectator') {
      if (!className.includes('creative')) setClassName(className + ' creative')
    } else {
      setClassName(className.replace(' creative', ''))
    }
  }, [gameMode])

  useEffect(() => {
    if (isHardcore) {
      if (!className.includes('hardcore')) setClassName(className + ' hardcore')
    } else {
      setClassName(className.replace(' hardcore', ''))
    }
  }, [isHardcore])

  useEffect(() => {
    if (damaged && !className.includes('damaged')) {
      if (!className.includes('damaged')) setClassName(className + ' damaged')
    } else {
      setClassName(className.replace(' damaged', ''))
    }
  }, [damaged])

  useEffect(() => {
    if (healthValue <= 4) {
      setClassName(className + ' low')
    } else {
      setClassName(className.replace(' low', ''))
    }

    const healthElement = healthRef.current
    if (!healthElement) return
    const hearts = healthElement.children

    for (const heart of hearts) {
      heart.classList.remove('full')
      heart.classList.remove('half')
    }

    for (let i = 0; i < Math.ceil(healthValue / 2); i++) {
      if (i >= hearts.length) break

      if (healthValue % 2 !== 0 && Math.ceil(healthValue / 2) === i + 1) {
        hearts[i].classList.add('half')
      } else {
        hearts[i].classList.add('full')
      }
    }
  }, [healthValue])

  useEffect(() => {
    effectAdded(healthRef.current, effectToAdd)
  }, [effectToAdd])

  useEffect(() => {
    effectEnded(healthRef.current, effectToRemove)
  }, [effectToRemove])

  return <div ref={healthRef} className={ `health ${className}` } >
    {
      Array.from({ length: 10 }, () => 0)
        .map(
          (num, index) => <div 
            key={`heart-${index}`}
            className='heart' 
            style={{ backgroundImage: `url(${icons}), url(${icons})` }}></div>
        )
    }
  </div>
}


