import { createContext, useState } from 'react'
import { contro, customKeymaps } from '../controls'
import KeybindingsScreen from './KeybindingsScreen'
import { useIsModalActive } from './utilsApp'
import { getStoredValue, setStoredValue } from './storageProvider'
import { CustomCommandsMap } from './KeybindingsCustom'


export const updateCustomBinds = (customCommands?: CustomCommandsMap) => {
  if (customCommands) {
    setStoredValue('customCommands', customCommands)
  }

  customCommands ??= getStoredValue('customCommands') ?? {}

  contro.inputSchema.commands.custom = Object.fromEntries(Object.entries(customCommands).map(([key, value]) => {
    return [key, {
      keys: [],
      gamepadButtons: [],
      type: '',
      inputs: []
    }]
  }))

  contro.userConfig!.custom = Object.fromEntries(Object.entries(customCommands).map(([key, value]) => {
    return [key, {
      keys: value.keys ?? undefined,
      gamepad: value.gamepad ?? undefined,
      type: value.type,
      inputs: value.inputs
    }]
  }))
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
}

const bindingActions = {
  updateCustomBinds,
  updateBinds
}

export const BindingActionsContext = createContext(bindingActions)

export default () => {
  const [bindActions, setBindActions] = useState(bindingActions)
  const isModalActive = useIsModalActive('keybindings')
  if (!isModalActive) return null

  const hasPsGamepad = [...(navigator.getGamepads?.() ?? [])].some(gp => gp?.id.match(/playstation|dualsense|dualshock/i)) // todo: use last used gamepad detection
  return <BindingActionsContext.Provider value={bindActions}>
    <KeybindingsScreen isPS={hasPsGamepad} contro={contro} />
  </BindingActionsContext.Provider>
}
