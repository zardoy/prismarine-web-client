import type { Meta, StoryObj } from '@storybook/react'

import XPBar from './XPBar'

const meta: Meta<typeof XPBar> = {
  component: XPBar
}

export default meta
type Story = StoryObj<typeof XPBar>

export const Primary: Story = {
  args: {
    progress: 1,
    level: 5
  },
  // add slider for progress
  argTypes: {
    progress: {
      control: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.1
      }
    }
  }
}
