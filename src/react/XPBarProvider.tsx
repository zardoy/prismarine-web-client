import { useState, useMemo } from 'react'
import { GameMode } from 'mineflayer'
import XPBar from './XPBar'


export default () => {
  const [progress, setProgress] = useState(bot.experience.progress)
  const [level, setLevel] = useState(bot.experience.level)
  const [gamemode, setGamemode] = useState<GameMode | ''>('')

  useMemo(() => {
    const onXpUpdate = () => {
      setProgress(bot.experience.progress)
      setLevel(bot.experience.level)
    }

    bot.on('experience', onXpUpdate)

    bot.on('game', () => {
      setGamemode(prev => bot.game.gameMode)
    })
  }, [])

  return <XPBar progress={progress} level={level} gamemode={gamemode} />
}
