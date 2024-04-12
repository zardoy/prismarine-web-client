import { action } from '@storybook/addon-actions'
import { withKnobs, number } from '@storybook/addon-knobs'
import XPBar from './XPBar'

export default {
  title: 'XPBar',
  component: XPBar,
  decorators: [withKnobs],
}

export const Default = () => (
  <XPBar
    progress={number('Progress', 0.5, { range: true, min: 0, max: 1, step: 0.1 })}
    level={number('Level', 1)}
    gamemode={'survival'}
  />
)
