import { ControMax } from 'contro-max/build/controMax'
import { proxy, subscribe } from 'valtio'
import { CommandEventArgument, SchemaCommandInput } from 'contro-max/build/types'
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

const customKeymaps = proxy(JSON.parse(localStorage.keymap || '{}'))

const controEx = new ControMax({
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
    return false
  },
  storeProvider: {
    load: () => customKeymaps,
    save () { },
  },
  gamepadPollingInterval: 10
})

export const Primary: Story = {
  args: {
    contro: controEx
  }
}
