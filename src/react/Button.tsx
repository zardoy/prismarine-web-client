import classNames from 'classnames'
import { createContext, FC, Ref, useContext } from 'react'
import buttonCss from './button.module.css'
import SharedHudVars from './SharedHudVars'
import PixelartIcon from './PixelartIcon'

// testing in storybook from deathscreen

interface Props extends React.ComponentProps<'button'> {
  label?: string
  icon?: string
  children?: React.ReactNode
  inScreen?: boolean
  rootRef?: Ref<HTMLButtonElement>
}

const ButtonContext = createContext({
  onClick () { },
})

export const ButtonProvider: FC<{ children, onClick }> = ({ children, onClick }) => {
  return <ButtonContext.Provider value={{ onClick }}>{children}</ButtonContext.Provider>
}

export default (({ label, icon, children, inScreen, rootRef, type = 'button', ...args }) => {
  const ctx = useContext(ButtonContext)

  const onClick = (e) => {
    ctx.onClick()
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

  return <SharedHudVars>
    <button ref={rootRef} {...args} className={classNames(buttonCss.button, args.className)} onClick={onClick} type={type}>
      {icon && <PixelartIcon className={buttonCss.icon} iconName={icon} />}
      {label}
      {children}
    </button>
  </SharedHudVars>
}) satisfies FC<Props>
