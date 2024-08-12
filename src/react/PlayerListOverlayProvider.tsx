import { useSnapshot } from 'valtio'
import { useState, useEffect, useMemo } from 'react'
import { isGameActive, loadedGameState } from '../globalState'
import PlayerListOverlay from './PlayerListOverlay'
import './PlayerListOverlay.css'

const MAX_ROWS_PER_COL = 10

type Players = typeof bot.players

export default () => {
  const { serverIp } = useSnapshot(loadedGameState)
  const [clientId, setClientId] = useState('')
  const [players, setPlayers] = useState<Players>({})
  const [isOpen, setIsOpen] = useState(false)

  const handleKeyDown = (e) => {
    if (!isGameActive(true)) return
    if (e.key === 'Tab') {
      setIsOpen(prev => true)
      e.preventDefault()
    }
  }

  const handleKeyUp = (e) => {
    if (e.key === 'Tab') {
      setIsOpen(prev => false)
      e.preventDefault()
    }
  }

  useMemo(() => {
    function requestUpdate () {
      // Placeholder for requestUpdate logic
      setPlayers(bot.players)
    }

    bot.on('playerUpdated', () => requestUpdate())
    bot.on('playerJoined', () => requestUpdate())
    bot.on('playerLeft', () => requestUpdate())
  }, [])

  useEffect(() => {
    setPlayers(bot.players)
    if (bot.player) {
      setClientId(bot.player.uuid)
    } else {
      bot._client.on('player_info', () => {
        setClientId(bot.player?.uuid)
      })
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [serverIp])


  const playersArray = Object.values(players).sort((a, b) => {
    if (a.username > b.username) return 1
    if (a.username < b.username) return -1
    return 0
  })
  const lists = [] as Array<typeof playersArray>

  let tempList = [] as typeof playersArray
  for (let i = 0; i < playersArray.length; i++) {
    tempList.push(playersArray[i])

    if ((i + 1) % MAX_ROWS_PER_COL === 0 || i + 1 === playersArray.length) {
      lists.push([...tempList])
      tempList = []
    }
  }

  if (!isOpen) return null

  return <PlayerListOverlay
    playersLists={lists}
    clientId={clientId}
    tablistHeader={bot.tablist.header}
    tablistFooter={bot.tablist.footer}
    serverIP={serverIp ?? ''}
  />
}
