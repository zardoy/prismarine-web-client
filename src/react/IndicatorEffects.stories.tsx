import type { Meta, StoryObj } from '@storybook/react'

import IndicatorEffects from './IndicatorEffects'
import { images } from './effectsImages'

const meta: Meta<typeof IndicatorEffects> = {
  component: IndicatorEffects
}

export default meta
type Story = StoryObj<typeof IndicatorEffects>;

export const Primary: Story = {
  args: {
    indicators: [] as any,
    effects: [
      {
        image: images.glowing,
        time: 200,
        level: 255,
        removeEffect (image: string) {}
      },
      {
        image: images.absorption,
        time: 30,
        level: 99,
        removeEffect (image: string) {}
      }
    ],
  }
}
