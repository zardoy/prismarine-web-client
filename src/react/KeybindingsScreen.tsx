import { useState, useEffect, useRef, createContext, useContext } from 'react'
import { UserOverridesConfig } from 'contro-max/build/types/store'
import { contro as controEx } from '../controls'
import { hideModal } from '../globalState'
import triangle from './ps_icons/playstation_triangle_console_controller_gamepad_icon.svg'
import square from './ps_icons/playstation_square_console_controller_gamepad_icon.svg'
import circle from './ps_icons/circle_playstation_console_controller_gamepad_icon.svg'
import cross from './ps_icons/cross_playstation_console_controller_gamepad_icon.svg'
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
    setUserConfig (config) { },
    handleClick: (() => { }) as HandleClick,
    parseBindingName (binding) { },
    bindsMap: { keyboard: {} as any, gamepad: {} as any }
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
  const [customCommands, setCustomCommands] = useState<CustomCommandsMap>(userConfig.custom as CustomCommandsMap ?? {})

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
      const originalType = type === 'keys' ? 'code' : 'gamepadButtons'
      if (type) {
        newConfig[group][command][type] ??= group === 'custom' ? [] : [...contro.inputSchema.commands[group][command][originalType]]
        newConfig[group][command][type]![buttonIndex] = data.code ?? data.button
      }


      return newConfig
    })
  }

  const resetBinding = (group: string, command: string, inputType: string) => {
    if (!userConfig?.[group]?.[command]) return

    setUserConfig(prev => {
      const newConfig = { ...prev }
      const prop = inputType === 'keyboard' ? 'keys' : 'gamepad'
      newConfig[group][command][prop] = undefined
      return newConfig
    })
  }

  useEffect(() => {
    updateBinds(userConfig)
    setCustomCommands({ ...userConfig.custom as CustomCommandsMap })

    updateBindMap()
  }, [userConfig])

  const updateKeyboardBinding = (e: import('react').KeyboardEvent<HTMLDivElement>) => {
    if (!e.code || e.key === 'Escape' || !awaitingInputType) return
    setBinding({ code: e.code, state: true }, groupName, actionName, buttonNum)
  }

  const updateGamepadBinding = (data: any) => {
    if ((!data.state && awaitingInputType) || !awaitingInputType) {
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


  return <Context.Provider value={ {
    isPS,
    userConfig,
    setUserConfig,
    handleClick,
    parseBindingName,
    bindsMap: bindsMap.current
  }}>
    <Screen title="Keybindings" backdrop>
      {awaitingInputType && <AwaitingInputOverlay isGamepad={awaitingInputType === 'gamepad'} />}
      <div className={styles.container}
        ref={containerRef}
        onKeyDown={(e) => updateKeyboardBinding(e)}
      >
        <div style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '6px',
          textAlign: 'center'
        }}>
          Note: Left, right and middle click keybindings are hardcoded and cannot be changed currently.
        </div>
        <Button
          onClick={() => { hideModal() }}
          style={{ alignSelf: 'center' }}
        >Back</Button>

        {Object.entries(commands).map(([group, actions], index) => {
          if (group === 'custom') return null
          return <div key={`group-container-${group}-${index}`} className={styles.group}>
            <div className={styles['group-category']}>{group}</div>
            {group === 'general' ? (
              <div style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '6px',
                textAlign: 'center'
              }}>
                Note: Left, right and middle click keybindings are hardcoded and cannot be changed currently.
              </div>
            ) : null}
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
          customCommands={customCommands}
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
  const { isPS, userConfig, handleClick, parseBindingName, bindsMap } = useContext(Context)

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
    {userConfig?.[group]?.[action]?.[inputType === 'keyboard' ? 'keys' : 'gamepad']?.some(
      key => Object.keys(bindsMap[inputType]).includes(key)
        && bindsMap[inputType][key].length > 1
        && bindsMap[inputType][key].some(
          prop => prop.index === index
            && prop.group === group
            && prop.action === action
        )
    ) ? (
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
      ) : null}
  </div>
}

export const AwaitingInputOverlay = ({ isGamepad }) => {
  return <div style={{
    position: 'fixed',
    inset: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: 'white',
    fontSize: 24,
    zIndex: 10
  }}
  >
    <div >
      {isGamepad ? 'Press the button on the gamepad ' : 'Press the key, side mouse button '}
      or ESC to cancel.
    </div>
    <Button
      onClick={() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      }}
    >
      Cancel
    </Button>
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
