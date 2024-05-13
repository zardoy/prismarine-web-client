import { createContext, useState } from 'react'
import { contro } from '../controls'
import { customCommandsConfig } from '../customCommands'
import KeybindingsScreen from './KeybindingsScreen'
import { useIsModalActive } from './utilsApp'


const customCommandsHandler = (buttonData, handlerData) => {
  if (!buttonData.state) return

  const codeOrButton = buttonData.code ?? buttonData.button
  const codeOrButtonSet = handlerData.keys ?? handlerData.gamepad
  if (!codeOrButtonSet) return
  if (codeOrButtonSet.includes(codeOrButton)) {
    handlerData.custonCommandsConfig[handlerData.type].handler(handlerData.inputs)
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

  for (const [key, customCommandData] of Object.entries(commands.custom)) {
    contro.on('pressedKeyOrButtonChanged', (buttonData) => { 
      customCommandsHandler(buttonData, { customCommandsConfig, ...customCommandData }) 
    })
  }
}

const bindingActions = {
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
