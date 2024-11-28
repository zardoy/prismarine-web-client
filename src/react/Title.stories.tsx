import type { Meta, StoryObj } from '@storybook/react'

import Title from './Title'

const meta: Meta<typeof Title> = {
  component: Title
}

export default meta
type Story = StoryObj<typeof Title>

export const Primary: Story = {
  args: {
    openTitle: false,
    openActionBar: false,
    title: {
      text: 'New title',
    },
    subtitle: {
      text: 'Subtitle'
    },
    actionBar: {
      text: 'Action bar text'
    },
    transitionTimes: {
      fadeIn: 2500,
      stay: 17_500,
      fadeOut: 5000
    }
  }
}
