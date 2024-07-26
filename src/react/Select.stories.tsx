import type { Meta, StoryObj } from '@storybook/react'

import { CSSProperties } from 'react'
import Select from './Select'

const meta: Meta<typeof Select> = {
  component: Select,
}

export default meta
type Story = StoryObj<typeof Select>

export const Primary: Story = {
  args: {
    initialOptions: {
      options: ['option 1', 'option 2', 'option 3'],
      selected: 'option 1'
    },
    updateOptions (options) {
      console.log('updated options:', options)
    },
    validateInputOption (option) {
      if (option === 'option 3') {
        return { border: '1px solid yellow' } as CSSProperties
      }
    }
  },
}
