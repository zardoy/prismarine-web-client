import { contro, customKeymaps } from '../controls'
import KeybindingsScreen from './KeybindingsScreenApp'
import { useIsModalActive } from './utils'


const setBinding = (data, group, command, buttonNum) => {
  if (!customKeymaps) return
  customKeymaps[group] ??= {}
  customKeymaps[group][command] ??= {}

  if ('code' in data) {
    if (!customKeymaps[group][command].keys) customKeymaps[group][command].keys = [] as string[]
    switch (customKeymaps[group][command].keys.length) {
      case 0:
        if (buttonNum === 1
          && contro.inputSchema.commands[group]?.[command]?.keys) {
          customKeymaps[group][command].keys.push(contro.inputSchema.commands[group][command].keys[0], data.code)
        } else {
          customKeymaps[group][command].keys.push(data.code)
        }
        break
      case 1:
        if (buttonNum === 0) { customKeymaps[group][command].keys[0] = data.code }
        else { customKeymaps[group][command].keys.push(data.code) }
        break
      case 2:
        customKeymaps[group][command].keys[buttonNum] = data.code
        break
    }
  } else if ('button' in data) {
    if (!customKeymaps[group][command].gamepad) customKeymaps[group][command].gamepad = [] as string[]
    if (customKeymaps[group][command].gamepad?.[0]) {
      customKeymaps[group][command].gamepad[0] = data.button
    } else {
      customKeymaps[group][command].gamepad?.push(data.button)
    }
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

export default () => {
  const isModalActive = useIsModalActive('keybindings')
  if (!isModalActive) return null

  const hasPsGamepad = [...(navigator.getGamepads?.() ?? [])].some(gp => gp?.id.match(/playstation|dualsense|dualshock/i)) // todo: use last used gamepad detection
  return <KeybindingsScreen isPS={hasPsGamepad} contro={contro} resetBinding={resetBinding} setBinding={setBinding} />
}
