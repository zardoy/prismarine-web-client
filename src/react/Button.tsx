import { playSound } from '../menus/components/button'
import buttonCss from './button.module.css'

// testing in storybook from deathscreen

interface Props extends React.ComponentProps<'button'> {
  label?: string
  icon?: string
  children?: React.ReactNode
}

export default ({ label, icon, children, ...args }: Props) => {
  const onClick = (e) => {
    void playSound('button_click.mp3')
    args.onClick(e)
  }

  return <button className={buttonCss.button} onClick={onClick} {...args}>
    {icon && <iconify-icon class={buttonCss.icon} icon={icon}></iconify-icon>}
    {label}
    {children}
  </button>
}
