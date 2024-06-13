import type { Meta, StoryObj } from '@storybook/react'

import Minimap from './Minimap'

const meta: Meta<typeof Minimap> = {
  component: Minimap,
  args: {
  },
}

export default meta
type Story = StoryObj<typeof Minimap>;

export const Primary: Story = {
  args: {
  },
}
