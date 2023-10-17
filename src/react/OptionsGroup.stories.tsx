import type { Meta, StoryObj } from '@storybook/react'

import OptionsGroup from './OptionsGroup'

const meta: Meta<typeof OptionsGroup> = {
  component: OptionsGroup,
  // render: () => <OptionsGroup />
}

export default meta
type Story = StoryObj<typeof OptionsGroup>;

export const Primary: Story = {
  args: {
    group: 'controls',
    backButtonAction () { }
  },
}
