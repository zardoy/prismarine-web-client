import type { Meta, StoryObj } from '@storybook/react'

import SignEditor from './SignEditor'

const meta: Meta<typeof SignEditor> = {
  component: SignEditor,
  render (args) {
    return <SignEditor
      {...args} handleClick={(result) => {
        console.log('handleClick', result)
      }}
    />
  }
}

export default meta
type Story = StoryObj<typeof SignEditor>

export const Primary: Story = {
  args: {
    handleInput () {},
    isWysiwyg: false
  },
  parameters: {
    noScaling: true
  },
}
