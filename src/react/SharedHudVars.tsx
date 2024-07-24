import { CSSProperties, useEffect } from 'react'
import icons from 'mc-assets/dist/other-textures/1.19/gui/icons.png'
import widgets from 'mc-assets/dist/other-textures/latest/gui/widgets.png'
import bars from 'mc-assets/dist/other-textures/latest/gui/bars.png'

export default ({ children }): React.ReactElement => {
  useEffect(() => {
    if (document.getElementById('hud-vars-style')) return
    // 1. Don't inline long data URLs for better DX in elements tab
    // 2. Easier application to globally override icons with custom image (eg from resourcepacks)
    const css = /* css */`
      html {
        --widgets-gui-atlas: url(${widgets});
        --gui-icons: url(${icons}), url(${icons});
        --bars-gui-atlas: url(${bars});
        --hud-bottom-max: 0px;
        --hud-bottom-raw: max(env(safe-area-inset-bottom), var(--hud-bottom-max));
        --safe-area-inset-bottom: calc(var(--hud-bottom-raw) / 2);
      }
    `
    const style = document.createElement('style')
    style.id = 'hud-vars-style'
    style.textContent = css
    document.head.appendChild(style)
  }, [])

  return children
}
