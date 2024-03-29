import { useState, useEffect } from 'react'
import { isGameActive } from '../globalState'
import './PlayerListOverlay.css' 


const MAX_ROWS_PER_COL = 10

type Players = typeof bot.players

function PlayerListOverlay ({ serverIP }) {
  const [clientId, setClientId] = useState('')
  const [players, setPlayers] = useState<Players>({})
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Simulating componentDidMount
    init(serverIP)

    // Simulating componentWillUnmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [serverIP])

  function init (ip) {
    const playerList = document.getElementById('playerlist-container')

    setIsOpen(false)
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

    bot.on('playerUpdated', () => requestUpdate())
    bot.on('playerJoined', () => requestUpdate())
    bot.on('playerLeft', () => requestUpdate())
  }

  function handleKeyDown (e) {
    if (!isGameActive(true)) return
    if (e.key === 'Tab') {
      setIsOpen(true)
      e.preventDefault()
    }
  }

  function handleKeyUp (e) {
    if (!isOpen) return
    if (e.key === 'Tab') {
      setIsOpen(false)
      e.preventDefault()
    }
  }

  function requestUpdate () {
    // Placeholder for requestUpdate logic
    setPlayers(bot.players)
  }

  const lists = [] as any
  const playersArray = Object.values(players).sort((a, b) => {
    if (a.username > b.username) return 1
    if (a.username < b.username) return -1
    return 0
  })

  let tempList = [] as typeof playersArray
  for (let i = 0; i < playersArray.length; i++) {
    tempList.push(playersArray[i])

    if ((i + 1) % MAX_ROWS_PER_COL === 0 || i + 1 === playersArray.length) {
      lists.push([...tempList])
      tempList = []
    }
  }

  return (
    <div className="playerlist-container" id="playerlist-container" style={{ display: isOpen ? 'block' : 'none' }}>
      <span className="title">Server IP: {serverIP}</span>
      <div className="player-lists">
        {lists.map((list, index) => (
          <div key={index} className="player-list">
            {list.map(player => (
              <div key={player.uuid} className={`playerlist-entry${clientId === player.uuid ? ' active-player' : ''}`} id={`plist-player-${player.uuid}`}>
                {player.username}
                <div className="playerlist-ping">
                  <p className="playerlist-ping-value">{player.ping}</p>
                  <p className="playerlist-ping-label">ms</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default PlayerListOverlay

