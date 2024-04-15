import { useRef, useState, useEffect } from 'react'
import SharedHudVars from './SharedHudVars'
import './FoodBar.css'


export type FoodBarProps = {
  gameMode: string,
  food: number,
  effectToAdd: number | null,
  effectToRemove: number | null,
  effectAdded: (htmlElement: HTMLDivElement | null, effect: number | null) => void,
  effectEnded: (htmlElement: HTMLDivElement | null, effect: number | null) => void,
}

export default (
  {
    gameMode,
    food,
    effectToAdd,
    effectToRemove,
    effectAdded,
    effectEnded
  }: FoodBarProps) => {
  const foodRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (foodRef.current) {
      foodRef.current.classList.toggle('creative', gameMode === 'creative')
    }
  }, [gameMode])

  useEffect(() => {
    const foodbar = foodRef.current
    if (foodbar) {
      foodbar.classList.toggle('low', food <= 5)

      const foods = foodbar.children

      for (const food of foods) {
        food.classList.remove('full')
        food.classList.remove('half')
      }

      for (let i = 0; i < Math.ceil(food / 2); i++) {
        if (i >= foods.length) break

        if (food % 2 !== 0 && Math.ceil(food / 2) === i + 1) {
          foods[i].classList.add('half')
        } else {
          foods[i].classList.add('full')
        }
      }
    }
  }, [food])

  useEffect(() => {
    effectAdded(foodRef.current, effectToAdd)
  }, [effectToAdd])

  useEffect(() => {
    effectEnded(foodRef.current, effectToRemove)
  }, [effectToRemove])

  return <SharedHudVars> 
    <div ref={foodRef} className='foodbar' >
      {
        Array.from({ length: 10 }, () => 0)
          .map(
            (num, index) => <div
              key={`food-${index}`}
              className='food'></div>
          )
      }
    </div>
  </SharedHudVars>
}
