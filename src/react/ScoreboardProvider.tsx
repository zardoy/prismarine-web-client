import { useEffect, useState } from 'react'
import Scoreboard from './Scoreboard' 
import type { ScoreboardItems } from './Scoreboard'


export default function ScoreboardProvider () {
  const [title, setTitle] = useState('Scoreboard')
  const [items, setItems] = useState<ScoreboardItems>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    bot.on('scoreboardCreated', (scoreboard) => {
      setTitle(scoreboard.title)
      setItems([...scoreboard.items])
      setOpen(true)
    })
    bot.on('scoreboardTitleChanged', (scoreboard) => {
      setTitle(scoreboard.title)
    })
    bot.on('scoreUpdated', (scoreboard, item) => {
      setItems([...items, ...scoreboard.items])
    })
    bot.on('scoreRemoved', (scoreboard, item) => {
      setItems([...items, ...scoreboard.items])
    })
    bot.on('scoreboardDeleted', (scoreboard) => {
      setOpen(false)
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
