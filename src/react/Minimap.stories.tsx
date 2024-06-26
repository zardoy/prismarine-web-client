import { Vec3 } from 'vec3'
import type { Meta, StoryObj } from '@storybook/react'
import { DrawerAdapterImpl } from './MinimapProvider'

import Minimap from './Minimap'

const meta: Meta<typeof Minimap> = {
  component: Minimap,
}

export default meta
type Story = StoryObj<typeof Minimap>;

const adapter = new DrawerAdapterImpl(new Vec3(0, 0, 0))

adapter.getHighestBlockColor = (x: number, z: number) => {
  return 'green'
}

// const worldColors: string[][] = []
//
// const mapSize = 10
// for (let i = 0; i < mapSize; i += 1) {
//   worldColors[i] = [] as string[]
//   for (let j = 0; j < mapSize; j += 1) {
//     const randColor = Math.floor(Math.random() * 255)
//     worldColors[i][j] = `rgb(${randColor}, ${randColor}, ${randColor})`
//   }
// }
//
export const Primary: Story = {
  args: {
    adapter
  },
}
