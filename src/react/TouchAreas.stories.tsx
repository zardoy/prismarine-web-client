import type { Meta, StoryObj } from '@storybook/react'

import TouchAreasControls from './TouchAreasControls'

const meta: Meta<typeof TouchAreasControls> = {
  component: TouchAreasControls,
  args: {
  },
}

export default meta
type Story = StoryObj<typeof TouchAreasControls>;

export const Primary: Story = {
  args: {
    touchActive: true,
    setupActive: true,
  },
}
