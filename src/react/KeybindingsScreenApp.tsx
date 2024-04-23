import { useState, useEffect, useRef } from 'react'
import { ControMax } from 'contro-max/build/controMax'
import { contro as controEx, setDoPreventDefault, customKeymaps } from '../controls'
import { showModal, hideModal } from '../globalState'
import { useIsModalActive } from './utils'
import Button from './Button'
import Screen from './Screen'
import styles from './KeybindingsScreen.module.css'


export default ({ contro, setBinding }: { contro: typeof controEx, setBinding: (e, group, action) => void }) => {
  const { commands } = contro.inputSchema
  const [awaitingInputType, setAwaitingInputType] = useState(null as null | 'keyboard' | 'gamepad')
  const [groupName, setGroupName] = useState('')
  const [actionName, setActionName] = useState('')

  const handleClickKeyboard = (group, action) => {
    setAwaitingInputType('keyboard')
    setGroupName(prev => group)
    setActionName(prev => action)
  }

  const handleClickGamepad = () => {
    setAwaitingInputType('gamepad')
  }
 
  const parseActionName = (action: string) => {
    const parts = action.split(/(?=[A-Z])/)
    parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    const newStr = parts.join(' ')
    return newStr
  }

  const handleInput = (e) => {
    if (!awaitingInputType) return
    if (e.key !== 'Escape') {
      setBinding(e, groupName, actionName)
    }
    setAwaitingInputType(null)
  }

  return <Screen title="Keybindings" backdrop>
					 {awaitingInputType && <AwaitingInputOverlay isGamepad={awaitingInputType === 'gamepad'} />}
					 <div className={styles.container}
      onKeyDown={handleInput}
					 >
      {Object.entries(commands).map(([group, actions]) => {
        return <div className={styles.group}>
								 <div className={styles['group-category']}>{group}</div>
								 {Object.entries(actions).map(([action, { keys, gamepadButtons }]) => {
								   return <div className={styles.actionBinds}>
									    <div className={styles.actionName}>{parseActionName(action)}</div>
									    {[0, 1].map((key, index) => <Button onClick={() => handleClickKeyboard(group, action)} className={styles.button}>{keys[index] ?? ''}</Button>)}
									    <Button className={styles.button}>{gamepadButtons[0]}</Button>
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
    zIndex: 10
  }}
  >
	   {isGamepad ? 'Press the button on the gamepad' : 'Press the key'}.
	   Press ESC to cancel.
	 </div>
}
