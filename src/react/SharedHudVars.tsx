import { CSSProperties, useEffect } from 'react'
import icons from 'minecraft-assets/minecraft-assets/data/1.17.1/gui/icons.png'

export default ({ children }) => {
  useEffect(() => {
    if (document.getElementById('hud-vars-style')) return
    // 1. Don't inline long data URLs for better DX in elements tab
    // 2. Easier application to globally override icons with custom image (eg from resourcepacks)
    const css = /* css */`
      :root {
        --gui-icons: url(${icons}), url(${icons});
      }
    `
    const style = document.createElement('style')
    style.id = 'hud-vars-style'
    style.textContent = css
    document.head.appendChild(style)
  }, [])

  const customVars = {
    '--safe-area-inset-bottom': 'calc(env(safe-area-inset-bottom) / 2)'
  } as CSSProperties

  return <div
    style={customVars}
  >{children}</div>
}
