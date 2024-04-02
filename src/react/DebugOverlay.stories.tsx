import type { Meta, StoryObj } from '@storybook/react'

import DebugOverlay from './DebugOverlay'

const meta: Meta<typeof DebugOverlay> = {
  component: DebugOverlay
}

export default meta
type Story = StoryObj<typeof DebugOverlay>;

export const Primary: Story = {
  args: {
    version: '1.0.0',
    entities: {} as any,
    game: {
      dimension: 'dimension'
    },
    entity: {
      position: {
        x: 0,
        y: 0,
        z: 0
      },
      yaw: 10,
      pitch: 10
    },
    time: {
      day: 1
    },
    packetsString: 'packets',
    customEntries: {
      'event1': 'nothing'
    },
    rendererDevice: 'device',
  },
  loadData: {
    biomesArray: [
      { name: 'plains' }
    ]
  }
}
