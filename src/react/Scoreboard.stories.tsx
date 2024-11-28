import type { Meta, StoryObj } from '@storybook/react'

import Scoreboard from './Scoreboard'

const meta: Meta<typeof Scoreboard> = {
  component: Scoreboard
}

export default meta
type Story = StoryObj<typeof Scoreboard>

export const Primary: Story = {
  args: {
    title: 'Scoreboard',
    items: [
      {
        name: 'item 1',
        value: 9
      },
      {
        name: 'item 2',
        value: 8
      }
    ],
    open: true
  }
}
