import { useState } from 'react'
import { contro } from '../controls'
import Button from './Button'
import Screen from './Screen'

export default () => {
  const { commands } = contro.inputSchema
  const [awaitingInputType, setAwaitingInputType] = useState(null as null | 'keyboard' | 'gamepad')

  // const

  return <Screen title="Keybindings" backdrop>
    {awaitingInputType && <AwaitingInputOverlay isGamepad={awaitingInputType === 'gamepad'} />}
    <p>Here you can change the keybindings for the game.</p>
    <div style={{
      display: 'flex',
      justifyContent: 'center',
    }}>
      {Object.entries(commands).map(([group, actions]) => {
        return <div>
          <h2>{group}</h2>
          {Object.entries(actions).map(([action, { keys, gamepadButtons }]) => {
            return <div style={{
              display: 'flex',
              gap: 5
            }}>
              <Button>{keys.join(', ')}</Button>
              <Button>{gamepadButtons.join(', ')}</Button>
            </div>
          })}
        </div>
      })}
    </div>
  </Screen>
}

const AwaitingInputOverlay = ({ isGamepad }) => {
  return <div style={{
    position: 'fixed',
    inset: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: 'white',
    fontSize: 24,
  }}>
    {isGamepad ? 'Press the button on the gamepad' : 'Press the key'}.
    Press ESC to cancel.
  </div>
}
