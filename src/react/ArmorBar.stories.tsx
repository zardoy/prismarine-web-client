import type { Meta, StoryObj } from '@storybook/react'
import icons from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/icons.png'

import ArmorBar from './ArmorBar'


const meta: Meta<typeof ArmorBar> = {
  component: ArmorBar,
  decorators: [(story) => <div style={{'--gui-icons': `url(${icons}), url(${icons})`} as any}>{story()}</div>]
}

export default meta
type Story = StoryObj<typeof ArmorBar>;

export const Primary: Story = {
  args: {
    armorValue: 10
  }
}
