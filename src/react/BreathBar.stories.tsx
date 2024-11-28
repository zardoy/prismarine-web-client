import type { Meta, StoryObj } from '@storybook/react'

import BreathBar from './BreathBar'

const meta: Meta<typeof BreathBar> = {
  component: BreathBar
}

export default meta
type Story = StoryObj<typeof BreathBar>

export const Primary: Story = {
  args: {
    oxygen: 20
  }
}
