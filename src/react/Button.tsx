import { forwardRef } from 'react'
import classNames from 'classnames'
import { loadSound, playSound } from '../basicSounds'
import buttonCss from './button.module.css'

// testing in storybook from deathscreen

interface Props extends React.ComponentProps<'button'> {
  label?: string
  icon?: string
  children?: React.ReactNode
  inScreen?: boolean
}

void loadSound('button_click.mp3')

export default forwardRef<HTMLButtonElement, Props>(({ label, icon, children, inScreen, ...args }, ref) => {
  const onClick = (e) => {
    void playSound('button_click.mp3')
    args.onClick?.(e)
  }
  if (inScreen) {
    args.style ??= {}
    args.style.width = 150
  }
  if (icon) {
    args.style ??= {}
    args.style.width = 20
  }

  return <button ref={ref} {...args} className={classNames(buttonCss.button, args.className)} onClick={onClick}>
    {icon && <iconify-icon class={buttonCss.icon} icon={icon}></iconify-icon>}
    {label}
    {children}
  </button>
})
