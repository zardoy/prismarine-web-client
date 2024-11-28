import type { BossBar as BossBarTypeRaw } from 'mineflayer'
import { useState, useEffect } from 'react'
import MessageFormattedString from './MessageFormattedString'
import './BossBarOverlay.css'

const colors = ['pink', 'blue', 'red', 'green', 'yellow', 'purple', 'white']
const divs = [0, 6, 10, 12, 20]
const translations = {
  'entity.minecraft.ender_dragon': 'Ender Dragon',
  'entity.minecraft.wither': 'Wither'
}

export type BossBarType = BossBarTypeRaw & {
  // todo why not use public properties?
  title: { text: string, translate: string },
  _title: { text: string, translate: string },
  _color: string,
  _dividers: number,
  _health: number
}

export default ({ bar }: { bar: BossBarType }) => {
  const [title, setTitle] = useState('')
  const [bossBarStyles, setBossBarStyles] = useState<{ [key: string]: string | number }>({})
  const [fillStyles, setFillStyles] = useState<{ [key: string]: string | number }>({})
  const [div1Styles, setDiv1Styles] = useState<{ [key: string]: string | number }>({})
  const [div2Styles, setDiv2Styles] = useState<{ [key: string]: string | number }>({})

  useEffect(() => {
    setTitle(bar._title.text ? bar.title.text : translations[bar.title.translate] || 'Unknown Entity')
    setBossBarStyles(prevStyles => ({
      ...prevStyles,
      backgroundPositionY: `-${colors.indexOf(bar._color) * 10}px`
    }))
    setFillStyles(prevStyles => ({
      ...prevStyles,
      width: `${bar._health * 100}%`,
      backgroundPositionY: `-${colors.indexOf(bar._color) * 10 + 5}px`
    }))
    setDiv1Styles(prevStyles => ({
      ...prevStyles,
      backgroundPositionY: `-${divs.indexOf(bar._dividers) * 10 + 70}px`
    }))
    setDiv2Styles(prevStyles => ({
      ...prevStyles,
      width: `${bar._health * 100}%`,
      backgroundPositionY: `-${divs.indexOf(bar._dividers) * 10 + 75}px`
    }))
  }, [bar])

  return (
    <div className="bossbar-container">
      <div className="bossbar-title"><MessageFormattedString message={title} /></div>
      <div className="bossbar" style={bossBarStyles}>
        <div className="fill" style={fillStyles} />
        <div className="fill" style={div1Styles} />
        <div className="fill" style={div2Styles} />
      </div>
    </div>
  )
}
