import { ControMax } from 'contro-max/build/controMax'
import { proxy } from 'valtio'
import { SchemaCommandInput } from 'contro-max/build/types'
import type { Meta, StoryObj } from '@storybook/react'

import KeybindingsScreenApp from './KeybindingsScreenApp'

const meta: Meta<typeof KeybindingsScreenApp> = {
  component: KeybindingsScreenApp
}

export default meta
type Story = StoryObj<typeof KeybindingsScreenApp>

const controlOptions = {
  preventDefault: true
}

const customKeymaps = proxy({})

const contro = new ControMax({
  commands: {
    general: {
      jump: ['Space', 'A'],
      inventory: ['KeyE', 'X'],
      drop: ['KeyQ', 'B'],
      sneak: ['ShiftLeft', 'Right Stick'],
      sprint: ['ControlLeft', 'Left Stick'],
      nextHotbarSlot: [null, 'Left Bumper'],
      prevHotbarSlot: [null, 'Right Bumper'],
      attackDestroy: [null, 'Right Trigger'],
      interactPlace: [null, 'Left Trigger'],
      chat: [['KeyT', 'Enter']],
      command: ['Slash'],
      selectItem: ['KeyH'] // default will be removed
    },
    ui: {
      back: [null/* 'Escape' */, 'B'],
      click: [null, 'A'],
    },
    advanced: {
      lockUrl: ['KeyY'],
    },
    custom: {}
    // waila: {
    //   showLookingBlockRecipe: ['Numpad3'],
    //   showLookingBlockUsages: ['Numpad4']
    // }
  } satisfies Record<string, Record<string, SchemaCommandInput>>,
  movementKeymap: 'WASD',
  movementVector: '2d',
  groupedCommands: {
    general: {
      switchSlot: ['Digits', []]
    }
  },
}, {
  defaultControlOptions: controlOptions,
  target: document,
  captureEvents () {
    return true
  },
  storeProvider: {
    load: () => customKeymaps,
    save () { },
  },
  gamepadPollingInterval: 10
})

const setBinding = (data, group, action, buttonNum) => {
  if (!contro.userConfig) return
  if (!contro.userConfig[group]) contro.userConfig[group] = {} as any
  if (!contro.userConfig[group][action]) {contro.userConfig[group][action] = { 
    keys: undefined as string[] | undefined, 
    gamepad: undefined as string[] | undefined 
  }}

  if ('code' in data) {
    if (!contro.userConfig[group][action].keys) contro.userConfig[group][action].keys = [] as string[]
    switch (contro.userConfig[group][action].keys.length) {
      case 0:
        if (buttonNum === 1 
          && contro.inputSchema.commands[group][action] 
          && contro.inputSchema.commands[group][action].keys) {
          contro.userConfig[group][action].keys.push(contro.inputSchema.commands[group][action].keys[0], data.code)
        } else {
          contro.userConfig[group][action].keys.push(data.code)
        }
        break
      case 1:
        if (buttonNum === 0) { contro.userConfig[group][action].keys[0] = data.code }
        else { contro.userConfig[group][action].keys.push(data.code) }
        break
      case 2:
        contro.userConfig[group][action].keys[buttonNum] = data.code
        break
    }
  } else if ('button' in data) {
    if (!contro.userConfig[group][action].gamepad) contro.userConfig[group][action].gamepad = [] as string[]
    if (contro.userConfig[group][action].gamepad?.[0]) {
      contro.userConfig[group][action].gamepad[0] = data.button
    } else {
      contro.userConfig[group][action].gamepad?.push(data.button)
    }
  }
}

const resetBinding = (group, action, inputType) => {
  if (!contro.userConfig?.[group]?.[action]) return
  switch (inputType) {
    case 'keyboard':
      contro.userConfig[group][action].keys = [] as string[]
      break
    case 'gamepad':
      contro.userConfig[group][action].gamepad = [] as string[]
      break
  }
}

export const Primary: Story = {
  args: {
    contro,
    setBinding,
    resetBinding,
    isPS: true
  }
}
