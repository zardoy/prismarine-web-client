import { useEffect, useState } from 'react'
import Scoreboard from './Scoreboard' 
import type { ScoreboardItems } from './Scoreboard'



export default function ScoreboardProvider () {
  const [name, setName] = useState('')
  const [title, setTitle] = useState('Scoreboard')
  const [items, setItems] = useState<ScoreboardItems>([])
  const [open, setOpen] = useState(false)

  const updateScoreboard = (scoreboard, HandlerFunction) => {
    if (scoreboard.name === name) HandlerFunction() 
  }

  useEffect(() => {
    bot.on('scoreboardCreated', (scoreboard) => {
      setName(scoreboard.name)
      setTitle(scoreboard.title)
      setItems(scoreboard.items)
      setOpen(true)
    })
    bot.on('scoreboardTitleChanged', (scoreboard) => {
      updateScoreboard(scoreboard, () => {setTitle(scoreboard.title)})
    })
    bot.on('scoreUpdated', (scoreboard, item) => {
      updateScoreboard(scoreboard, () => {setItems(scoreboard.items)})
    })
    bot.on('scoreRemoved', (scoreboard, item) => {
      updateScoreboard(scoreboard, () => {setItems(scoreboard.items)})
    })
    bot.on('scoreboardDeleted', (scoreboard) => {
      updateScoreboard(scoreboard, () => {setOpen(false)})
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
