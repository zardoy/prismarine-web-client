import { useEffect, useState } from 'react'
import Scoreboard from './Scoreboard' 
import type { ScoreboardItems } from './Scoreboard'


const updateScoreboard = () => {
  console.log(bot.scoreboard.sidebar)
}

export default function ScoreboardProvider () {
  const [title, setTitle] = useState('Scoreboard')
  const [items, setItems] = useState<ScoreboardItems>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    bot.on('scoreboardCreated', (scoreboard) => {
      setOpen(open)
    })
    bot.on('scoreUpdated', (scoreboard, item) => {
      console.log(scoreboard)
      console.log(item)
    })
  }, [])

  return(
    <Scoreboard 
      title={title}
      items={items}
      open={open}
    />
  )
}
