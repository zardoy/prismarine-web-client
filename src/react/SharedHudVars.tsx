import { CSSProperties } from 'react'
import icons from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/icons.png'

export default ({ children }) => {
  const customVars = {
    '--gui-icons': `url(${icons}), url(${icons})`,
    '--safe-area-inset-bottom': 'calc(env(safe-area-inset-bottom) / 2)'
  } as CSSProperties

  return <div 
    style={customVars}
  >{children}</div>
}
