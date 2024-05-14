import { createContext, useState, useEffect } from 'react'
import { useSnapshot } from 'valtio'
import { contro } from '../controls'
import { customCommandsConfig } from '../customCommands'
import { miscUiState } from '../globalState'
import KeybindingsScreen from './KeybindingsScreen'
import { useIsModalActive } from './utilsApp'
import { CustomCommand } from './KeybindingsCustom'


const customCommandsHandler = (buttonData: { code?: string, button?: string, state: boolean }) => {
  if (!buttonData.state) return

  const codeOrButton = buttonData.code ?? buttonData.button
  const inputType = buttonData.code ? 'keys' : 'gamepad'
  for (const value of Object.values(contro.userConfig!.custom)) {
    if (value[inputType]?.includes(codeOrButton!)) {
      customCommandsConfig[(value as CustomCommand).type].handler((value as CustomCommand).inputs)
    }
  }
}

export const updateBinds = (commands: any) => {
  contro.inputSchema.commands.custom = Object.fromEntries(Object.entries(commands?.custom ?? {}).map(([key, value]) => {
    return [key, {
      keys: [],
      gamepadButtons: [],
      type: '',
      inputs: []
    }]
  }))

  for (const [group, actions] of Object.entries(commands)) {
    contro.userConfig![group] = Object.fromEntries(Object.entries(actions).map(([key, value]) => {
      const newValue = {
        keys: value?.keys ?? undefined,
        gamepad: value?.gamepad ?? undefined,
      }

      if (group === 'custom') {
        newValue['type'] = (value).type
        newValue['inputs'] = (value).inputs
      }

      return [key, newValue]
    }))
  }

  if (!commands['custom']) return

  //todo: don't trigger handler when setting new binding
  contro.enabled = false
  contro.off('pressedKeyOrButtonChanged', customCommandsHandler)
  contro.on('pressedKeyOrButtonChanged', customCommandsHandler)
  contro.enabled = true
}

const bindingActions = {
  updateBinds
}

export const BindingActionsContext = createContext(bindingActions)

export default () => {
  const [bindActions, setBindActions] = useState(bindingActions)
  const isModalActive = useIsModalActive('keybindings')
  const { gameLoaded } = useSnapshot(miscUiState)

  useEffect(() => {
    if (gameLoaded) {
      contro.on('pressedKeyOrButtonChanged', customCommandsHandler)
    } else {
      contro.off('pressedKeyOrButtonChanged', customCommandsHandler)
    }
  }, [gameLoaded])

  if (!isModalActive) return null

  const hasPsGamepad = [...(navigator.getGamepads?.() ?? [])].some(gp => gp?.id.match(/playstation|dualsense|dualshock/i)) // todo: use last used gamepad detection
  return <BindingActionsContext.Provider value={bindActions}>
    <KeybindingsScreen isPS={hasPsGamepad} contro={contro} />
  </BindingActionsContext.Provider>
}
