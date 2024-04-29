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
        <><div key={group} className={styles['group-category']}>{group}</div>
          {customConfig.filter(x => x.type === group).map(({ keys, gamepad, inputs }, indexOption) => {
            return <div key={indexOption}>
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
        </>
      ))}
      <div className={styles['group-category']}>Chat commands</div>
      {userConfig.custom &&
        Object.entries(userConfig.custom)
          .map(([action, { keys, gamepadButtons }]) =>
            <ChatCommandBind
              key={`${action}`}
              group={'custom'}
              action={action}
              parseBindingName={parseBindingName}
              handleClick={handleClick}
              keys={keys}
              userConfig={userConfig}
              gamepadButtons={gamepadButtons}
              resetBinding={resetBinding}
              setActionName={setActionName}
              setGroupName={setGroupName}
              isPS={isPS}
            />
          )}

      <Button
        onClick={addNewCommand}
        icon={'pixelarticons:add-box'}
        style={{
          alignSelf: 'center'
        }}
      />
    </div>
    <div className={styles.group}>
      <div className={styles['group-category']}>Custom scripts</div>
      <Button
        icon={'pixelarticons:add-box'}
        style={{
          alignSelf: 'center'
        }}
      />
    </div>
    <div className={styles.group}>
      <div className={styles['group-category']}>Toggle settings</div>
      <Button
        icon={'pixelarticons:add-box'}
        style={{
          alignSelf: 'center'
        }}
      />
    </div>
  </>
}

const ChatCommandBind = ({
  group,
  action,
  parseBindingName,
  handleClick,
  userConfig,
  keys,
  gamepadButtons,
  isPS,
  setGroupName,
  setActionName,
  resetBinding
}) => {


  return <>
    <div key={`${group}-${action}`} className={styles.actionBinds} style={{ paddingLeft: '25px' }}>
      {
        userConfig?.[group]?.[action]?.keys?.length ? <Button
          key={`keyboard-undo-${group}-${action}`}
          onClick={() => {
            setActionName(prev => action)
            setGroupName(prev => group)
            resetBinding(group, action, 'keyboard')
          }}
          className={styles['undo-keyboard']}
          style={{ left: '1%' }}
          icon={'pixelarticons:undo'}
        />
          : null
      }
      {userConfig[group] &&
        [0, 1].map((key, index) => <ButtonWithMatchesAlert
          key={`keyboard-button-${group}-${action}-${index}`}
          group={group}
          action={action}
          index={index}
          parseBindingName={parseBindingName}
          handleClick={handleClick}
          inputType={'keyboard'}
          keys={keys}
          userConfig={userConfig}
          gamepadButtons={gamepadButtons}
          isPS={isPS}
        />)
      }
      {
        userConfig?.[group]?.[action]?.gamepad?.length ? <Button
          key={`gamepad-undo-${group}-${action}`}
          onClick={() => {
            setActionName(prev => action)
            setGroupName(prev => group)
            resetBinding(group, action, 'gamepad')
          }}
          className={styles['undo-gamepad']}
          style={{ left: '44.5%' }}
          icon={'pixelarticons:undo'}
        />
          : null
      }
      <ButtonWithMatchesAlert
        group={group}
        action={action}
        index={0}
        parseBindingName={parseBindingName}
        handleClick={handleClick}
        inputType={'gamepad'}
        keys={keys}
        userConfig={userConfig}
        gamepadButtons={gamepadButtons}
        isPS={isPS}
      />
      <Button
        onClick={(e) => {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete userConfig[group][action]
        }}
        icon={'pixelarticons:delete'}
        style={{
          color: 'red',
        }} />
    </div>
    <input
      type="text"
      className={`${styles['chat-command']}`}
      placeholder='Chat command' />
  </>
}
