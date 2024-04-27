import { useState } from 'react'
import { contro as controEx } from '../controls'
import { AwaitingInputOverlay, ButtonWithMatchesAlert } from './KeybindingsScreenApp'
import Button from './Button'
import PixelartIcon from './PixelartIcon'
import styles from './KeybindingsScreen.module.css'


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
  const [, forceUpdate] = useState(false)

  const addNewChatCommand = (e) => {
    let chatCommands
    if (userConfig.custom) {
      chatCommands = Object.keys(userConfig.custom)
    } else {
      chatCommands = [] as string[]
    }
    let commandName = 'chat_command_' + generateCode()
    while (chatCommands.includes(commandName)) {
      commandName = 'chat_command_' + generateCode()
    }
    setBinding({}, 'custom', commandName, 0)
    forceUpdate(prev => !prev)
  }

  return <>
    <div className={styles.group}>
      <div className={styles['group-category']}>Chat commands</div>
      {userConfig.custom &&
        Object.entries(userConfig.custom)
          .map(([action, { keys, gamepadButtons }]) => <ChatCommandBind
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
            forceUpdate={forceUpdate}
            isPS={isPS}
          />
          )}

      <Button
        onClick={addNewChatCommand}
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
  resetBinding,
  forceUpdate
}) => {


  return <>
    <div key={`${group}-${action}`} className={styles.actionBinds} style={{ paddingLeft: '25px' }}>
      {
        userConfig?.[group]?.[action]?.keys?.length ? <Button
          key={`keyboard-undo-${group}-${action}`}
          onClick={() => {
            setActionName(prev => action)
            setGroupName(prev => group)
            forceUpdate(prev => !prev)
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
          delete userConfig[group][action]
          forceUpdate(prev => !prev)
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

const generateCode = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const digits = '0123456789'

  let code = ''
  for (let i = 0; i < 4; i++) {
    const randomLetter = letters.charAt(Math.floor(Math.random() * letters.length))
    const randomDigit = digits.charAt(Math.floor(Math.random() * digits.length))
    code += (i < 3) ? randomLetter : '_' + randomDigit
  }

  return code
}

