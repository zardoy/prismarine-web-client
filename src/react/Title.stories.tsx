import type { Meta, StoryObj } from '@storybook/react'

import Message from "./Message"

const meta: Meta<typeof Message> = {
  component: Message
}

export default meta
type Story = StoryObj<typeof Message>;

export const Primary: Story = {
  args: {
    title: {
      text: "New title",
    },
    subtitle: {
      text: "Subtitle"
    },
    actionBar: {
      text: "Action bar text"
    },
    tooltip: {
      text: "Tooltip text"
    }
  }
}

export const TitlesOnly: Story = {
  args: {
    title: {
      text: "New title",
    },
    subtitle: {
      text: "Subtitle"
    },
  }
}

export const ActionsOnly: Story = {
  args: {
    actionBar: {
      text: "Action bar text"
    },
    tooltip: {
      text: "Tooltip text"
    }
  }
}
