import { useEffect } from 'react'

// appReplacableResources
import { appReplacableResources } from '../generated/resources'

export default ({ children }): React.ReactElement => {
  useEffect(() => {
    if (document.getElementById('hud-vars-style')) return
    // 1. Don't inline long data URLs for better DX in elements tab
    // 2. Easier application to globally override icons with custom image (eg from resourcepacks)
    const css = /* css */`
      html {
        ${Object.values(appReplacableResources).filter(r => r.cssVar).map(r => {
      const repeat = 'cssVarRepeat' in r ? r.cssVarRepeat : 1
      return `${r.cssVar}:${` url('${r.content}')`.repeat(repeat)};`
    }).join('\n')}

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
