import { useState } from 'react'
import { ControMax } from 'contro-max/build/controMax'
import Button from './Button'
import Screen from './Screen'
import styles from './KeybindingsScreen.module.css'

export default (contro: any) => {
  const { commands } = contro.contro.inputSchema
  const [awaitingInputType, setAwaitingInputType] = useState(null as null | 'keyboard' | 'gamepad')

  const parseActionName = (action: string) => {
    const parts = action.split(/(?=[A-Z])/)
		parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    const newStr = parts.join(' ')
    return newStr
  }

  return <Screen title="Keybindings" backdrop>
					 {awaitingInputType && <AwaitingInputOverlay isGamepad={awaitingInputType === 'gamepad'} />}
					 <div className={styles.container} >
      {Object.entries(commands).map(([group, actions]) => {
        return <div className={styles.group}>
								 <div style={{ fontSize: '1.2rem', textAlign: 'center', gridColumn: 'span 2' }}>{group}</div>
								 {Object.entries(actions).map(([action, { keys, gamepadButtons }]) => {
									 return <div className={styles.actionBinds}>
														<div className={styles.actionName}>{parseActionName(action)}</div>
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
