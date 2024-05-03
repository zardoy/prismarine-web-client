import type { Meta, StoryObj } from '@storybook/react'

import HealthBar from './HealthBar'

const meta: Meta<typeof HealthBar> = {
  component: HealthBar
}

export default meta
type Story = StoryObj<typeof HealthBar>;

const getEffectClass = (effect) => {
  switch (effect.id) {
    case 19:
      return 'poisoned'
    case 20:
      return 'withered'
    case 22:
      return 'absorption'
    default:
      return ''
  }
}

export const Primary: Story = {
  args: {
    gameMode: 'survival',
    isHardcore: true,
    damaged: false,
    healthValue: 10,
    effectToAdd: 19,
    effectToRemove: 20,
    effectAdded (htmlElement, effect) {
      const effectClass = getEffectClass(effect)
      if (!effectClass) return
      if (htmlElement) htmlElement.classList.add(effectClass)
    },
    effectEnded (htmlElement, effect) {
      const effectClass = getEffectClass(effect)
      if (!effectClass) return
      if (htmlElement) htmlElement.classList.remove(effectClass)
    }

  }
}
