import type { Meta, StoryObj } from '@storybook/react'

import SignEditor from './SignEditor'

const meta: Meta<typeof SignEditor> = {
  component: SignEditor
}

export default meta
type Story = StoryObj<typeof SignEditor>;

export const Primary: Story = {
  args: {
    handleInput () {},
    isWysiwyg: false
  }
}

