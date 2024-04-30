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
    custom: {
    }
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

const setBinding = (data, group, command, buttonNum) => {
  if (!customKeymaps) return
  customKeymaps[group] ??= {}
  customKeymaps[group][command] ??= {}

  if ('code' in data) {
    if (!customKeymaps[group][command].keys) customKeymaps[group][command].keys = [] as string[]
    switch (customKeymaps[group][command].keys.length) {
      case 0:
        if (buttonNum === 1
          && contro.inputSchema.commands[group][command]
          && contro.inputSchema.commands[group][command].keys) {
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

export const Primary: Story = {
  args: {
    contro,
    setBinding,
    resetBinding,
    isPS: true
  }
}
