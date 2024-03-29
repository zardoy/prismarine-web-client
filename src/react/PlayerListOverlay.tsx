import MessageFormattedString from './MessageFormattedString'
import './PlayerListOverlay.css'


type PlayersLists = import('mineflayer').Player[][]

type PlayerListOverlayProps = {
  playersLists: PlayersLists,
  clientId: string,
  tablistHeader: string | Record<string, any> | null,
  tablistFooter: string | Record<string, any> | null,
  serverIP: string
}

export default ({ playersLists, clientId, tablistHeader, tablistFooter, serverIP }: PlayerListOverlayProps) => {

  return <div className="playerlist-container" id="playerlist-container" >
    <span className="title">Server IP: {serverIP}</span>
    <div className='playerlist-header'>
      <MessageFormattedString message={tablistHeader} />
    </div>
    <div className="player-lists">
      {playersLists.map((list, index) => (
        <div key={index} className="player-list">
          {list.map(player => (
            <div key={player.uuid} className={`playerlist-entry${clientId === player.uuid ? ' active-player' : ''}`} id={`plist-player-${player.uuid}`}>
              <MessageFormattedString message={player.username} />
              <div className="playerlist-ping">
                <p className="playerlist-ping-value">{player.ping}</p>
                <p className="playerlist-ping-label">ms</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
    <div className='playerlist-footer'>
      <MessageFormattedString message={tablistFooter} />
    </div>
  </div>
}
