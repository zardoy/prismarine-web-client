import { createContext, useState } from 'react'
import { contro, customKeymaps } from '../controls'
import KeybindingsScreen from './KeybindingsScreen'
import { useIsModalActive } from './utils'
import { getStoredValue, setStoredValue } from './storageProvider'
import { CustomCommandsMap } from './KeybindingsCustom'


const setBinding = (data, group, command, buttonNum) => {
  if (!customKeymaps) return
  customKeymaps[group] ??= {}
  customKeymaps[group][command] ??= structuredClone(contro.inputSchema.commands[group][command])

  // keys and buttons should always exist in commands
  if ('code' in data) {
    customKeymaps[group][command].keys ??= []
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    customKeymaps[group][command].keys![buttonNum] = data.code
  } else if ('button' in data) {
    customKeymaps[group][command].gamepad ??= []
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    customKeymaps[group][command].gamepad![buttonNum] = data.button
  }
}

const resetBinding = (group, command, inputType) => {
  if (!customKeymaps?.[group]?.[command]) return
  switch (inputType) {
    case 'keyboard':
      customKeymaps[group][command].keys = undefined as string[] | undefined
      break
    case 'gamepad':
      customKeymaps[group][command].gamepad = undefined as string[] | undefined
      break
  }
}

const bindingActions = {
  setBinding,
  resetBinding
}

const BindingActionsContext = createContext(bindingActions)

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
    }]
  }))

  // todo is that needed?
  contro.userConfig!.custom = Object.fromEntries(Object.entries(customCommands).map(([key, value]) => {
    // resolved
    return [key, {
      keys: value.keys ?? [],
      gamepad: value.gamepad ?? [],
    }]
  }))
}

export default () => {
  const [bindActions, setBindActions] = useState(bindingActions)
  const isModalActive = useIsModalActive('keybindings')
  if (!isModalActive) return null

  const hasPsGamepad = [...(navigator.getGamepads?.() ?? [])].some(gp => gp?.id.match(/playstation|dualsense|dualshock/i)) // todo: use last used gamepad detection
  return <BindingActionsContext.Provider value={bindActions}>
    <KeybindingsScreen isPS={hasPsGamepad} contro={contro} customCommands={getStoredValue('customCommands') ?? {}} updateCustomCommands={updateCustomBinds} />
  </BindingActionsContext.Provider>
}
