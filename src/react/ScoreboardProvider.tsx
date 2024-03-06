import { useEffect, useState } from 'react'
import Scoreboard from './Scoreboard' 
import type { ScoreboardItems } from './Scoreboard'



export default function ScoreboardProvider () {
  const [name, setName] = useState('scoreboard')
  const [title, setTitle] = useState('Scoreboard')
  const [items, setItems] = useState<ScoreboardItems>([])
  const [open, setOpen] = useState(false)

  const updateScoreboard = (scoreboard, HandlerFunction) => {
    if (scoreboard.name === name) HandlerFunction() 
  }

  useEffect(() => {
    bot.on('scoreboardCreated', (scoreboard) => {
      console.log(scoreboard)
      setTitle(scoreboard.title)
      setItems(scoreboard.items)
      setName(scoreboard.name) // name state doesnt change. Why ??
      // to test locally:
      // 1. bot._client.emit('scoreboard_objective', {action: 0, name: 'name', displayText: 'test'})
      // 2. bot._client.emit('scoreboard_score', {action: 0, scoreName: 'name', itemName: 'item 1', value: 5})
      setOpen(true)
    })
    bot.on('scoreboardTitleChanged', (scoreboard) => {
      updateScoreboard(scoreboard, () => {setTitle(scoreboard.title)})
    })
    bot.on('scoreUpdated', (scoreboard, item) => {
      console.log(name)
      console.log(scoreboard.name)
      if (scoreboard.name === name) setItems([...items, ...scoreboard.items])
    })
    bot.on('scoreRemoved', (scoreboard, item) => {
      if (scoreboard.name === name) setItems([...items, ...scoreboard.items])
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
