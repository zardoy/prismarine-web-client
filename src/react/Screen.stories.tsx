import type { Meta, StoryObj } from '@storybook/react'

import Screen from './Screen'
import Button from './Button'

const meta: Meta<typeof Screen> = {
  component: Screen,
  render: () => <Screen title='test'>
    {Array.from({ length: 10 }).map((_, i) => <Button key={i}>test {i}</Button>)}
  </Screen>
}

export default meta
type Story = StoryObj<typeof Screen>;

export const Primary: Story = {
  args: {
  },
}
