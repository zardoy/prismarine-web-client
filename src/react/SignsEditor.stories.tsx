import type { Meta, StoryObj } from '@storybook/react'

import SignsEditor from './SignsEditor'

const meta: Meta<typeof SignsEditor> = {
  component: SignsEditor
}

export default meta
type Story = StoryObj<typeof SignsEditor>;

export const Primary: Story = {
  args: {
    handleInput () {},
    isWysiwyg: false
  }
}

