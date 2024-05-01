import { useEffect, useState } from 'react'
import { contro as controEx } from '../controls'
import { customCommandsConfig } from '../customCommands'
import { AwaitingInputOverlay, ButtonWithMatchesAlert } from './KeybindingsScreenApp'
import Button from './Button'
import PixelartIcon from './PixelartIcon'
import styles from './KeybindingsScreen.module.css'
import Input from './Input'

export default (
  {
    commands,
    userConfig,
    awaitingInputType,
    setBinding,
    setAwaitingInputType,
    setGroupName,
    setActionName,
    setButtonNum,
    updateBindMap,
    updateBindWarnings,
    handleClick,
    parseBindingName,
    resetBinding,
    isPS
  }: {
    commands: any,
    userConfig: any,
    awaitingInputType: 'keyboard' | 'gamepad' | null,
    setAwaitingInputType: (state: typeof awaitingInputType) => void,
    setGroupName: (state: string) => void,
    setActionName: (state: string) => void,
    setButtonNum: (state: number) => void,
    setBinding: (e, group, action, buttonNum, inputType?) => void,
    updateBindMap: () => void,
    updateBindWarnings: () => void,
    handleClick: (group, action, index, type) => void,
    parseBindingName: (name: string) => string,
    resetBinding: (group, action, inputType) => void,
    isPS: boolean | undefined
  }
) => {
  type CustomCommand = {
    keys: string[],
    gamepad: string[]
    type: string
    inputs: any[]
  }
  // todo need to save custom actions to localstorage in the upper component and pass it down parsed to keybindings with config inputs
  const [customConfig, setCustomConfig] = useState({} as Record<string, CustomCommand>)
  const [, forceUpdate] = useState(false)
  useEffect(() => {
    localStorage.setItem('customConfig', JSON.stringify(customConfig))
  }, [customConfig])

  const addNewCommand = (type) => {
    const newKey = generateUniqueString(Object.keys(customConfig))
    setCustomConfig(prev => {
      const newConf = { ...commands.custom }
      newConf[newKey] = {
        keys: [] as any[],
        gamepad: [] as any[],
        type,
        inputs: [] as any[]
      }
      commands.custom = { ...newConf }
      const newCustomConf = { ...prev }
      newCustomConf[newKey] = {
        keys: undefined as any[] || undefined,
        gamepad: undefined as any[] || undefined,
        type,
        inputs: [] as any[]
      }
      return newCustomConf
    })

    // setBinding({}, 'custom', commandName, 0)
  }

  const setInputValue = (optionKey, indexInput, value) => {
    setCustomConfig(prev => {
      const newConfig = { ...prev }
      newConfig[optionKey].inputs[indexInput] = value
      userConfig.custom = { ...newConfig }
      return newConfig
    })
  }

  return <>
    <div className={styles.group}>
      {Object.entries(customCommandsConfig).map(([group, { input }]) => (
        <div className={styles.group}><div key={group} className={styles['group-category']}>{group}</div>
          {Object.entries(customConfig).filter(([key, data]) => data.type === group).map(([commandKey, { keys, gamepad, type, inputs }], indexOption) => {
            return <div key={indexOption}>
              <div style={{ paddingLeft: '20px' }} className={styles.actionBinds}>
                <Button
                  onClick={() => {
                    console.log('reset', group, commandKey)
                    resetBinding('custom', commandKey, 'keyboard')
                    updateBindMap()
                    updateBindWarnings()
                    forceUpdate(prev => !prev)
                  }}
                  className={styles['undo-keyboard']}
                  style={{ left: '0px' }}
                  icon={'pixelarticons:undo'}
                />
                {[0, 1].map((key, index) => <ButtonWithMatchesAlert
                  key={`custom-keyboard-${index}`}
                  group={'custom'}
                  action={commandKey}
                  index={index}
                  handleClick={handleClick}
                  inputType={'keyboard'}
                  parseBindingName={parseBindingName}
                  userConfig={userConfig}
                  keys={keys}
                  gamepadButtons={gamepad}
                  isPS={isPS}
                />
                )}
                <ButtonWithMatchesAlert
                  key={`custom-gamepad-0`}
                  group={'custom'}
                  action={commandKey}
                  index={0}
                  handleClick={handleClick}
                  inputType={'gamepad'}
                  parseBindingName={parseBindingName}
                  userConfig={userConfig}
                  keys={keys}
                  gamepadButtons={gamepad}
                  isPS={isPS}
                />
              </div>
              {input.map((obj, indexInput) => {
                const config = typeof obj === 'function' ? obj(inputs) : obj
                if (!config) return null

                return config.type === 'select'
                  ? <select key={indexInput} onChange={(e) => {
                    setInputValue(commandKey, indexInput, e.target.value)
                  }}>{config.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                  : <Input key={indexInput} placeholder={config.placeholder} value={inputs[indexInput]} onChange={(e) => setInputValue(indexOption, indexInput, e.target.value)} />
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
