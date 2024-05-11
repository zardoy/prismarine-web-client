import { useState, useEffect, useRef, createContext, useContext, ComponentProps, KeyboardEvent } from 'react'
import { UserOverridesConfig } from 'contro-max/build/types/store'
import { contro as controEx } from '../controls'
import triangle from '../../assets/playstation_triangle_console_controller_gamepad_icon.svg'
import square from '../../assets/playstation_square_console_controller_gamepad_icon.svg'
import circle from '../../assets/circle_playstation_console_controller_gamepad_icon.svg'
import cross from '../../assets/cross_playstation_console_controller_gamepad_icon.svg'
import PixelartIcon from './PixelartIcon'
import KeybindingsCustom, { CustomCommandsMap } from './KeybindingsCustom'
import { BindingActionsContext } from './KeybindingsScreenProvider'
import Button from './Button'
import Screen from './Screen'
import styles from './KeybindingsScreen.module.css'


type HandleClick = (group: string, action: string, index: number, type: string | null) => void

type setBinding = (data: any, group: string, command: string, buttonIndex: number) => void

export const Context = createContext(
  {
    isPS: false as boolean | undefined,
    userConfig: controEx?.userConfig ?? {} as UserOverridesConfig | undefined,
    handleClick: (() => {}) as HandleClick,
    parseBindingName (binding) {}
  }
)

export default (
  {
    contro,
    isPS,
  }: {
    contro: typeof controEx,
    isPS?: boolean
  } 
) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const bindsMap = useRef({ keyboard: {} as any, gamepad: {} as any })
  const { commands } = contro.inputSchema
  const [userConfig, setUserConfig] = useState(contro.userConfig ?? {})
  const [awaitingInputType, setAwaitingInputType] = useState(null as null | 'keyboard' | 'gamepad')
  const [groupName, setGroupName] = useState('')
  const [actionName, setActionName] = useState('')
  const [buttonNum, setButtonNum] = useState(0)
  const { updateBinds } = useContext(BindingActionsContext)
  const [customCommands, setCustomCommands] = useState(userConfig.custom ?? {})

  const updateCurrBind = (group: string, action: string) => {
    setGroupName(prev => group)
    setActionName(prev => action)
  }

  const handleClick: HandleClick = (group, action, index, type) => {
    //@ts-expect-error
    setAwaitingInputType(type)
    updateCurrBind(group, action)
    setButtonNum(prev => index)
  }

  const setBinding: setBinding = (data, group, command, buttonIndex) => {
    setUserConfig(prev => {
      const newConfig = { ...prev }
      newConfig[group] ??= {}
      newConfig[group][command] ??= {}

      // keys and buttons should always exist in commands
      const type = 'code' in data ? 'keys' : 'button' in data ? 'gamepad' : null
      if (type) {
        newConfig[group][command][type] ??= group === 'custom' ? [] : [...contro.inputSchema.commands[group][command][type]]
        newConfig[group][command][type]![buttonIndex] = data.code ?? data.button
      }

      updateBinds(newConfig)
      setCustomCommands({ ...newConfig.custom })

      return newConfig
    })
  }

  const resetBinding = (group: string, command: string, inputType: string) => {
    if (!userConfig?.[group]?.[command]) return

    setUserConfig(prev => {
      const newConfig = { ...prev }
      const prop = inputType === 'keyboard' ? 'keys' : 'gamepad'
      newConfig[group][command][prop] = undefined
      updateBinds(newConfig)
      return newConfig
    })
  }

  useEffect(() => {
    // for (const [group, commands] of Object.entries(userConfig)) {
    //   if (group === 'custom') continue
    //   contro.userConfig![group] = Object.fromEntries(Object.entries(commands).map(([key, value]) => {
    //     return [key, {
    //       keys: value.keys ?? undefined,
    //       gamepad: value.gamepad ?? undefined,
    //     }]
    //   }))
    // }

    updateBindMap()
    updateBindWarnings()
  }, [userConfig])

  const updateKeyboardBinding = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!e.code || e.key === 'Escape' || !awaitingInputType) return
    setBinding({ code: e.code, state: true }, groupName, actionName, buttonNum)
  }

  const updateGamepadBinding = (data: any) => {
    if (!data.state && awaitingInputType) {
      setAwaitingInputType(null)
      return
    }
    if ('button' in data) {
      contro.enabled = false
      void Promise.resolve().then(() => { contro.enabled = true })
      setBinding(data, groupName, actionName, buttonNum)
    }

    setAwaitingInputType(null)
  }

  const updateBindMap = () => {
    bindsMap.current = { keyboard: {} as any, gamepad: {} as any }
    if (commands) {
      for (const [group, actions] of Object.entries(commands)) {
        for (const [action, { keys, gamepadButtons }] of Object.entries(actions)) {
          if (keys) {
            let currKeys
            if (userConfig?.[group]?.[action]?.keys) {
              currKeys = userConfig[group][action].keys
            } else {
              currKeys = keys
            }
            for (const [index, key] of currKeys.entries()) {
              bindsMap.current.keyboard[key] ??= []
              if (!bindsMap.current.keyboard[key].some(obj => obj.group === group && obj.action === action && obj.index === index)) {
                bindsMap.current.keyboard[key].push({ group, action, index })
              }
            }
          }
          if (gamepadButtons) {
            let currButtons
            if (userConfig?.[group]?.[action]?.gamepad) {
              currButtons = userConfig[group][action].gamepad
            } else {
              currButtons = gamepadButtons
            }
            if (currButtons.length > 0) {
              bindsMap.current.gamepad[currButtons[0]] ??= []
              bindsMap.current.gamepad[currButtons[0]].push({ group, action, index: 0 })
            }
          }
        }
      }
    }
  }

  const updateBindWarnings = () => {
    if (!commands) return
    for (const [group, actions] of Object.entries(commands)) {
      for (const [action, { keys, gamepadButtons }] of Object.entries(actions)) {
        if (!containerRef.current) continue
        if (keys) {
          let currKeys
          if (userConfig?.[group]?.[action]?.keys) {
            currKeys = userConfig[group][action].keys
          } else {
            currKeys = keys
          }
          for (const [index, key] of currKeys.entries()) {
            const elem = containerRef.current.querySelector<HTMLElement>(`#bind-warning-${group}-${action}-keyboard-${index}`)
            if (!elem) continue
            if (bindsMap.current.keyboard[key].length > 1) {
              for (const bind of bindsMap.current.keyboard[key]) {
                const currElem = containerRef.current.querySelector<HTMLElement>(`#bind-warning-${bind.group}-${bind.action}-keyboard-${bind.index}`)
                if (!currElem) continue
                currElem.style.display = 'flex'
              }
            } else {
              elem.style.display = 'none'
            }
          }
          if (currKeys.length === 1) {
            const elem = containerRef.current.querySelector<HTMLElement>(`#bind-warning-${group}-${action}-keyboard-1`)
            if (!elem) continue
            elem.style.display = 'none'
          }
          if (currKeys.length === 0) {
            for (const index of [0, 1]) {
              const elem = containerRef.current.querySelector<HTMLElement>(`#bind-warning-${group}-${action}-keyboard-${index}`)
              if (!elem) continue
              elem.style.display = 'none'
            }
          }
        } else {
          const elem = containerRef.current.querySelector<HTMLElement>(`#bind-warning-${group}-${action}-keyboard-1`)
          if (!elem) continue
          elem.style.display = 'none'
        }
        if (gamepadButtons) {
          let currButtons
          if (userConfig?.[group]?.[action]?.gamepad) {
            currButtons = userConfig[group][action].gamepad
          } else {
            currButtons = gamepadButtons
          }
          const elem = containerRef.current.querySelector<HTMLElement>(`#bind-warning-${group}-${action}-gamepad-0`)
          if (!elem || !currButtons || currButtons.length === 0) continue
          if (bindsMap.current.gamepad[currButtons[0]].length > 1) {
            for (const bind of bindsMap.current.gamepad[currButtons[0]]) {
              const currElem = containerRef.current.querySelector<HTMLElement>(`#bind-warning-${bind.group}-${bind.action}-gamepad-${bind.index}`)
              if (!currElem) continue
              currElem.style.display = 'flex'
            }
          } else {
            elem.style.display = 'none'
          }
        } else {
          const elem = containerRef.current.querySelector<HTMLElement>(`#bind-warning-${group}-${action}-keyboard-1`)
          if (!elem) continue
          elem.style.display = 'none'
        }
      }
    }
  }

  // fill binds map
  useEffect(() => {
    updateBindMap()
  }, [])

  useEffect(() => {
    contro.on('pressedKeyOrButtonChanged', updateGamepadBinding)

    return () => {
      contro.off('pressedKeyOrButtonChanged', updateGamepadBinding)
    }
  }, [groupName, actionName])


  return <Context.Provider value={{ isPS, userConfig: contro.userConfig, handleClick, parseBindingName }}>
    <Screen title="Keybindings" backdrop>
      {awaitingInputType && <AwaitingInputOverlay isGamepad={awaitingInputType === 'gamepad'} />}
      <div className={styles.container}
        ref={containerRef}
        onKeyDown={(e) => updateKeyboardBinding(e)}
      >

        {Object.entries(commands).map(([group, actions], index) => {
          if (group === 'custom') return null
          return <div key={`group-container-${group}-${index}`} className={styles.group}>
            <div className={styles['group-category']}>{group}</div>
            {Object.entries(actions).map(([action, { keys, gamepadButtons }]) => {
              return <div key={`action-container-${action}`} className={styles.actionBinds}>
                <div className={styles.actionName}>{parseActionName(action)}</div>
                {
                  userConfig?.[group]?.[action]?.keys?.length ? <Button
                    onClick={() => {
                      updateCurrBind(group, action)
                      resetBinding(group, action, 'keyboard')
                    }}
                    className={styles['undo-keyboard']}
                    icon={'pixelarticons:undo'}
                  />
                    : null}

                {[0, 1].map((key, index) => <ButtonWithMatchesAlert
                  key={`keyboard-${group}-${action}-${index}`}
                  group={group}
                  action={action}
                  index={index}
                  inputType={'keyboard'}
                  keys={keys}
                  gamepadButtons={gamepadButtons}
                />)}
                <ButtonWithMatchesAlert
                  key={`gamepad-${group}-${action}`}
                  group={group}
                  action={action}
                  index={0}
                  inputType={'gamepad'}
                  keys={keys}
                  gamepadButtons={gamepadButtons}
                />
                {
                  userConfig?.[group]?.[action]?.gamepad?.length ? <Button
                    key={`keyboard-${group}-${action}`}
                    onClick={() => {
                      updateCurrBind(group, action)
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

        <KeybindingsCustom
          customCommands={customCommands as CustomCommandsMap}
          updateCurrBind={updateCurrBind}
          resetBinding={resetBinding}
        />
      </div>
    </Screen>
  </Context.Provider>
}

export const ButtonWithMatchesAlert = ({
  group,
  action,
  index,
  inputType,
  keys,
  gamepadButtons,
}) => {
  const { isPS, userConfig, handleClick, parseBindingName } = useContext(Context)

  return <div
    key={`warning-container-${inputType}-${action}`}
    className={`${styles['warning-container']} ${inputType === 'gamepad' ? styles['margin-left'] : ''}`}
  >
    {inputType === 'keyboard'
      ?
      <Button
        key={`keyboard-${group}-${action}-${index}`}
        onClick={() => handleClick(group, action, index, inputType)}
        className={`${styles.button}`}>
        {
          (userConfig?.[group]?.[action]?.keys?.length
						&& parseBindingName(userConfig[group]?.[action]?.keys?.[index]))
						|| (keys?.length && parseBindingName(keys[index]))
					|| ''
        }
      </Button>
      :
      <Button
        className={`${styles.button}`}
        onClick={() => handleClick(group, action, 0, 'gamepad')}
      >
        {isPS ? (
          gamepadButtons?.[0] ? (
            buttonsMap[gamepadButtons[0]] ? (
              <img style={{ width: '15px' }} src={buttonsMap[gamepadButtons[0]]} alt='' />
            ) : (
              gamepadButtons[0]
            )
          ) : (
            ''
          )
        ) : (
          gamepadButtons?.[0] ?? ''
        )}
      </Button>

    }
    <div id={`bind-warning-${group}-${action}-${inputType}-${index}`} className={styles['matched-bind-warning']}>
      <PixelartIcon
        iconName={'alert'}
        width={5}
        styles={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: '2px'
        }} />
      <div>
        This bind is already in use. <span></span>
      </div>
    </div>
  </div>
}

export const AwaitingInputOverlay = ({ isGamepad }) => {
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

const parseActionName = (action: string) => {
  const parts = action.split(/(?=[A-Z])/)
  parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
  return parts.join(' ')
}

const parseBindingName = (binding: string | undefined) => {
  if (!binding) return ''
  const cut = binding.replaceAll(/(Numpad|Digit|Key)/g, '')
  const parts = cut.split(/(?=[A-Z\d])/)
  return parts.reverse().join(' ')
}

const buttonsMap = {
  'A': cross,
  'B': circle,
  'X': square,
  'Y': triangle
}
