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
  const [customConfig, setCustomConfig] = useState([] as CustomCommand[]/* userConfig.custom */)
  useEffect(() => {
    localStorage.setItem('customConfig', JSON.stringify(customConfig))
    // userConfig.custom = customConfig
  }, [customConfig])

  const addNewCommand = (type) => {
    setCustomConfig(prev => [...prev, {
      keys: [],
      gamepad: [],
      type,
      inputs: []
    }])

    // setBinding({}, 'custom', commandName, 0)
  }

  const setInputValue = (indexOption, indexInput, value) => {
    setCustomConfig(prev => {
      const newConfig = [...prev]
      newConfig[indexOption].inputs[indexInput] = value
      return newConfig
    })
  }

  return <>
    <div className={styles.group}>
      {Object.entries(customCommandsConfig).map(([group, { input }]) => (
        <div className={styles.group}><div key={group} className={styles['group-category']}>{group}</div>
          {customConfig.filter(x => x.type === group).map(({ keys, gamepad, inputs }, indexOption) => {
            return <div key={indexOption}>
              <div className={styles.actionBinds}>
                <ButtonWithMatchesAlert
                  key={`custom-keybind-${indexOption}`}
                  group={group}
                  action={indexOption}
                  index={0}
                  handleClick={handleClick}
                  inputType={'keyboard'}
                  parseBindingName={parseBindingName}
                  userConfig={userConfig}
                  keys={keys}
                  gamepadButtons={gamepad}
                  isPS={isPS}
                />
                <ButtonWithMatchesAlert
                  key={`custom-keybind-${indexOption}`}
                  group={group}
                  action={indexOption}
                  index={1}
                  handleClick={handleClick}
                  inputType={'keyboard'}
                  parseBindingName={parseBindingName}
                  userConfig={userConfig}
                  keys={keys}
                  gamepadButtons={gamepad}
                  isPS={isPS}
                />
                <ButtonWithMatchesAlert
                  key={`custom-keybind-${indexOption}`}
                  group={group}
                  action={indexOption}
                  index={1}
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
                    setInputValue(indexOption, indexInput, e.target.value)
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
