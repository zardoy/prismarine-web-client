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
    // resolved
    return [key, {
      keys: [],
      gamepadButtons: [],
      type: null,
      inputs: null
    }]
  }))

  // todo is that needed?
  contro.userConfig!.custom = Object.fromEntries(Object.entries(customCommands).map(([key, value]) => {
    // resolved
    return [key, {
      keys: value.keys ?? undefined,
      gamepad: value.gamepad ?? undefined,
      type: value.type,
      inputs: value.inputs
    }]
  }))
}

export const updateBinds = (commands?: typeof customKeymaps) => {
  for (const [ group, actions ] of Object.entries(commands!)) {
    contro.userConfig![group] = Object.fromEntries(Object.entries(actions).map(([key, value]) => {
      return [key, {
        keys: value.keys ?? undefined,
        gamepad: value.gamepad ?? undefined,
      }]
    }))
  }

}

const bindingActions = {
  updateCustomBinds,
  updateBinds
}

const BindingActionsContext = createContext(bindingActions)

export default () => {
  const [bindActions, setBindActions] = useState(bindingActions)
  const isModalActive = useIsModalActive('keybindings')
  if (!isModalActive) return null

  const hasPsGamepad = [...(navigator.getGamepads?.() ?? [])].some(gp => gp?.id.match(/playstation|dualsense|dualshock/i)) // todo: use last used gamepad detection
  return <BindingActionsContext.Provider value={bindActions}>
    <KeybindingsScreen isPS={hasPsGamepad} contro={contro} customCommands={getStoredValue('customCommands') ?? {}} updateCustomCommands={updateCustomBinds} />
  </BindingActionsContext.Provider>
}
