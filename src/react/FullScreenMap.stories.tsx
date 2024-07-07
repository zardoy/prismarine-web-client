import type { Meta, StoryObj } from '@storybook/react'

import FullScreenMap from './FullScreenMap'

const meta: Meta<typeof FullScreenMap> = {
  component: FullScreenMap
}

export default meta
type Story = StoryObj<typeof FullScreenMap>

export const Primary: Story = {
  args: {
  },
  parameters: {
    noScaling: true
  },
}
