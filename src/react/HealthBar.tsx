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

  useEffect(() => {
    if (healthRef.current) {
      healthRef.current.classList.toggle('creative', gameMode === 'creative' || gameMode === 'spectator')
      // if (gameMode === 'creative' || gameMode === 'spectator') {
      //   healthRef.current.classList.add('creative')
      // } else {
      //   healthRef.current.classList.remove('creative')
      // }
    }
  }, [gameMode])

  useEffect(() => {
    if (healthRef.current) {
      if (isHardcore) {
        healthRef.current.classList.add('hardcore')
      } else {
        healthRef.current.classList.remove('hardcore')
      }
    }
  }, [isHardcore])

  useEffect(() => {
    if (healthRef.current) {
      if (damaged) {
        healthRef.current.classList.add('damaged')
      } else {
        healthRef.current.classList.remove('damaged')
      }
    }
  }, [damaged])

  useEffect(() => {
    if (healthRef.current) {
      if (healthValue <= 4) {
        healthRef.current.classList.add('low')
      } else {
        healthRef.current.classList.remove('low')
      }

      const healthElement = healthRef.current
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
    }
  }, [healthValue])

  useEffect(() => {
    effectAdded(healthRef.current, effectToAdd)
  }, [effectToAdd])

  useEffect(() => {
    effectEnded(healthRef.current, effectToRemove)
  }, [effectToRemove])

  return <div ref={healthRef} className='health' >
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


