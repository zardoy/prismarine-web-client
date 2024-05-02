import { useState } from 'react'
import { customCommandsConfig } from '../customCommands'
import { ButtonWithMatchesAlert } from './KeybindingsScreen'
import Button from './Button'
import styles from './KeybindingsScreen.module.css'
import Input from './Input'

export default (
  {
    userConfig,
    setActionName,
    setGroupName,
    resetBinding
  }: {
    userConfig: any,
    setGroupName: (state: string) => void,
    setActionName: (state: string) => void,
    resetBinding: (group, action, inputType) => void,
  }
) => {
  type CustomCommand = {
    keys: undefined | string[]
    gamepad: undefined | string[]
    type: string
    inputs: any[]
  }
  const [customConfig, setCustomConfig] = useState(userConfig.custom || {} as Record<string, CustomCommand>)

  const addNewCommand = (type) => {
    const newKey = generateUniqueString(Object.keys(customConfig))
    const newObj = {
      keys: [] as string[],
      gamepad: [] as string[],
      type,
      inputs: [] as any[]
    }
    userConfig.custom ??= {}
    userConfig.custom[newKey] = newObj
    setCustomConfig(prev => {
      const newCustomConf = { ...prev }
      newCustomConf[newKey] = {
        keys: undefined as string[] | undefined,
        gamepad: undefined as string[] | undefined,
        type,
        inputs: [] as any[]
      }
      return newCustomConf
    })
  }

  const setInputValue = (optionKey, indexInput, value) => {
    setCustomConfig(prev => {
      const newConfig = { ...prev }
      newConfig[optionKey].inputs = [...prev[optionKey].inputs]
      newConfig[optionKey].inputs[indexInput] = value
      userConfig.custom[optionKey].inputs[indexInput] = value
      return newConfig
    })
  }

  return <>
    <div className={styles.group}>
      {Object.entries(customCommandsConfig).map(([group, { input }]) => (
        <div className={styles.group}><div key={group} className={styles['group-category']}>{group}</div>
          {Object.entries(userConfig.custom).filter(([key, data]) => data.type === group).map(([commandKey, { keys, gamepad, type, inputs }], indexOption) => {
            return <div key={indexOption}>
              <div style={{ paddingLeft: '20px' }} className={styles.actionBinds}>
                {
                  userConfig?.['custom']?.[commandKey]?.keys ? <Button
                    onClick={() => {
                      setActionName(commandKey)
                      setGroupName(group)
                      resetBinding('custom', commandKey, 'keyboard')
                    }}
                    className={styles['undo-keyboard']}
                    style={{ left: '0px' }}
                    icon={'pixelarticons:undo'}
                  />
                    : null}

                {[0, 1].map((key, index) => <ButtonWithMatchesAlert
                  key={`custom-keyboard-${index}`}
                  group={'custom'}
                  action={commandKey}
                  index={index}
                  inputType={'keyboard'}
                  keys={keys}
                  gamepadButtons={gamepad}
                />
                )}

                {
                  userConfig?.['custom']?.[commandKey]?.gamepad ? <Button
                    onClick={() => {
                      setActionName(commandKey)
                      setGroupName(group)
                      resetBinding('custom', commandKey, 'gamepad')
                    }}
                    className={styles['undo-keyboard']}
                    style={{ left: '44px' }}
                    icon={'pixelarticons:undo'}
                  />
                    : null}
                <ButtonWithMatchesAlert
                  key={`custom-gamepad-0`}
                  group={'custom'}
                  action={commandKey}
                  index={0}
                  inputType={'gamepad'}
                  keys={keys}
                  gamepadButtons={gamepad}
                />
                <Button
                  onClick={() => {
                    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                    delete userConfig.custom[commandKey]
                    setCustomConfig(prev => {
                      const newConfig = { ...prev }
                      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                      delete newConfig[commandKey]
                      return newConfig
                    })
                  }}

                  style={{ color: 'red' }}
                  icon={'pixelarticons:delete'}
                />
              </div>
              {input.map((obj, indexInput) => {
                const config = typeof obj === 'function' ? obj(inputs) : obj
                if (!config) return null

                return config.type === 'select'
                  ? <select key={indexInput} onChange={(e) => {
                    setInputValue(commandKey, indexInput, e.target.value)
                  }}>{config.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                  : <Input key={indexInput} rootStyles={{ width: '99%' }} placeholder={config.placeholder} value={inputs[indexInput]} onChange={(e) => setInputValue(commandKey, indexInput, e.target.value)} />
              })}
            </div>
          })}
          <Button
            onClick={() => addNewCommand(group)}
            icon={'pixelarticons:add-box'}
            style={{
              alignSelf: 'center'
            }}
          />
        </div>
      ))}
    </div>
  </>
}


const generateUniqueString = (arr: string[]) => {
  const randomLetter = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    return alphabet.charAt(Math.floor(Math.random() * alphabet.length))
  }

  const randomNumber = () => {
    return Math.floor(Math.random() * 1000).toString().padStart(4, '0')
  }

  let newString: string
  do {
    newString = `${randomLetter()}${randomLetter()}${randomLetter()}${randomLetter()}-${randomNumber()}`
  } while (arr.includes(newString))

  return newString
}
