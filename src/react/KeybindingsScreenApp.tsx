import { useState, useEffect, useRef, useMemo } from 'react'
import { contro as controEx, setDoPreventDefault, customKeymaps } from '../controls'
import Button from './Button'
import Screen from './Screen'
import styles from './KeybindingsScreen.module.css'


export default (
  {
    contro,
    setBinding,
    resetBinding
  } : {
		contro: typeof controEx,
		setBinding: (e, group, action, buttonNum, inputType?) => void,
		resetBinding: (group, action, intputType) => void
	}
) => {
  const { commands } = contro.inputSchema
  const { userConfig } = contro
  const [awaitingInputType, setAwaitingInputType] = useState(null as null | 'keyboard' | 'gamepad')
  const [groupName, setGroupName] = useState('')
  const [actionName, setActionName] = useState('')
  const [buttonNum, setButtonNum] = useState(0)
  const [, forceUpdate] = useState(false)

  const handleClick = (group, action, index, type) => {
    setAwaitingInputType(type)
    setGroupName(prev => group)
    setActionName(prev => action)
    setButtonNum(prev => index)
  }

  const parseActionName = (action: string) => {
    const parts = action.split(/(?=[A-Z])/)
    parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    const newStr = parts.join(' ')
    return newStr
  }

  const updateKeyboardBinding = (e) => {
    if (!e.code || e.key === 'Escape') return
    setBinding({ code: e.code, state: true }, groupName, actionName, buttonNum)
  }

  const updateGamepadBinding = (data) => {
    if (!data.state && awaitingInputType) {
      setAwaitingInputType(null)
      return
    }
    if ('button' in data) {
      setBinding(data, groupName, actionName, buttonNum)
    }
    
    setAwaitingInputType(null)
  }
  

  useEffect(() => {
    contro.on('pressedKeyOrButtonChanged', updateGamepadBinding)
  }, [groupName, actionName])


  return <Screen title="Keybindings" backdrop>
					 {awaitingInputType && <AwaitingInputOverlay isGamepad={awaitingInputType === 'gamepad'} />}
					 <div className={styles.container} 
      onKeyDown={(e) => updateKeyboardBinding(e)}
    >
      {Object.entries(commands).map(([group, actions]) => {
        return <div className={styles.group}>
								 <div className={styles['group-category']}>{group}</div>
								 {Object.entries(actions).map(([action, { keys, gamepadButtons }]) => {
								   return <div className={styles.actionBinds}>
									    <div className={styles.actionName}>{parseActionName(action)}</div>
              {
                userConfig?.[group]?.[action]?.keys?.length ? <Button
                  onClick={() => {
                    setActionName(prev => action)
                    setGroupName(prev => group)
                    forceUpdate(prev => !prev)
                    resetBinding(group, action, 'keyboard')
                  }}
                  className={styles['undo-keyboard']}
                  icon={'pixelarticons:undo'}
                />
                  : null}
									    {[0, 1].map((key, index) => <Button
                onClick={() => handleClick(group, action, index, 'keyboard')}
                className={styles.button}>
                {
                  (userConfig?.[group]?.[action]?.keys?.length !== undefined && userConfig[group]?.[action]?.keys?.[index]) || keys[index]
                }
              </Button>)}
									    <Button 
                className={`${styles.button} ${styles['margin-left']}`}
                onClick={() => handleClick(group, action, 0, 'gamepad')}
              >{gamepadButtons[0]}</Button>
              {
                userConfig?.[group]?.[action]?.gamepad?.length ? <Button
                  onClick={() => {
                    setActionName(prev => action)
                    setGroupName(prev => group)
                    forceUpdate(prev => !prev)
                    resetBinding(group, action, 'gamepad')
                  }}
                  className={styles['undo-gamepad']}
                  icon={'pixelarticons:undo'}
                />
                  : null
              }
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
