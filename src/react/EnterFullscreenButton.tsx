import { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { activeModalStack, miscUiState } from '../globalState'
import Button from './Button'
import { useUsingTouch } from './utilsApp'
import { pixelartIcons } from './PixelartIcon'

const hideOnModals = new Set(['chat'])

export default () => {
  const [fullScreen, setFullScreen] = useState(false)
  useEffect(() => {
    document.documentElement.addEventListener('fullscreenchange', () => {
      setFullScreen(!!document.fullscreenElement)
    })
  }, [])
  const { gameLoaded } = useSnapshot(miscUiState)

  const activeStack = useSnapshot(activeModalStack)

  const inMainMenu = activeStack.length === 0 && !gameLoaded

  const usingTouch = useUsingTouch()
  const hideButton = activeStack.some(x => hideOnModals.has(x.reactType))

  if (hideButton || !usingTouch || !document.documentElement.requestFullscreen || fullScreen) return null

  return <Button
    icon={pixelartIcons.scale}
    style={{
      position: 'fixed',
      top: 5,
      left: inMainMenu ? 35 : 5,
      width: 22,
    }}
    onClick={() => {
      void document.documentElement.requestFullscreen()
    }}
  />
}
