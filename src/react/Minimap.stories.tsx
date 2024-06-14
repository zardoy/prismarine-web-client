import type { Meta, StoryObj } from '@storybook/react'

import Minimap from './Minimap'

const meta: Meta<typeof Minimap> = {
  component: Minimap,
}

export default meta
type Story = StoryObj<typeof Minimap>;

const worldColors: string[][] = []

const mapSize = 10
for (let i = 0; i < mapSize; i += 1) {
  worldColors[i] = [] as string[]
  for (let j = 0; j < mapSize; j += 1) {
    const randColor = Math.floor(Math.random() * 255)
    worldColors[i][j] = `rgb(${randColor}, ${randColor}, ${randColor})`
  }
}

export const Primary: Story = {
  args: {
    worldColors
  },
}
