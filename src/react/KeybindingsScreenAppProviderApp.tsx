import { contro, customKeymaps } from '../controls'
import KeybindingsScreen from './KeybindingsScreenApp'
import { useIsModalActive } from './utils'


const setBinding = (data, group, action, buttonNum) => {
  if (!customKeymaps) return
  if (!customKeymaps[group]) customKeymaps[group] = {} as any
  if (!customKeymaps[group][action]) {
    customKeymaps[group][action] = {
      keys: undefined as string[] | undefined,
      gamepad: undefined as string[] | undefined
    }
  }

  if ('code' in data) {
    if (!customKeymaps[group][action].keys) customKeymaps[group][action].keys = [] as string[]
    switch (customKeymaps[group][action].keys.length) {
      case 0:
        if (buttonNum === 1
          && contro.inputSchema.commands[group][action]
          && contro.inputSchema.commands[group][action].keys) {
          customKeymaps[group][action].keys.push(contro.inputSchema.commands[group][action].keys[0], data.code)
        } else {
          customKeymaps[group][action].keys.push(data.code)
        }
        break
      case 1:
        if (buttonNum === 0) { customKeymaps[group][action].keys[0] = data.code }
        else { customKeymaps[group][action].keys.push(data.code) }
        break
      case 2:
        customKeymaps[group][action].keys[buttonNum] = data.code
        break
    }
  } else if ('button' in data) {
    if (!customKeymaps[group][action].gamepad) customKeymaps[group][action].gamepad = [] as string[]
    if (customKeymaps[group][action].gamepad?.[0]) {
      customKeymaps[group][action].gamepad[0] = data.button
    } else {
      customKeymaps[group][action].gamepad?.push(data.button)
    }
  }
}

const resetBinding = (group, action, inputType) => {
  if (!customKeymaps?.[group]?.[action]) return
  switch (inputType) {
    case 'keyboard':
      customKeymaps[group][action].keys = undefined as string[] | undefined
      break
    case 'gamepad':
      customKeymaps[group][action].gamepad = undefined as string[] | undefined
      break
  }
}

export default () => {
  const isModalActive = useIsModalActive('keybindings')
  if (!isModalActive) return null

  const hasPsGamepad = [...(navigator.getGamepads?.() ?? [])].some(gp => gp?.id.match(/playstation|dualsense|dualshock/i)) // todo: use last used gamepad detection
  return <KeybindingsScreen isPS={hasPsGamepad} contro={contro} resetBinding={resetBinding} setBinding={setBinding} />
}
