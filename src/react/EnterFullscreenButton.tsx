import { useUsingTouch } from '@dimaka/interface'
import { useEffect, useState } from 'react'
import Button from './Button'

export default () => {
  const [fullScreen, setFullScreen] = useState(false)
  useEffect(() => {
    document.documentElement.addEventListener('fullscreenchange', () => {
      setFullScreen(!!document.fullscreenElement)
    })
  }, [])

  const usingTouch = useUsingTouch()
  if (!usingTouch || !document.documentElement.requestFullscreen || fullScreen) return null

  return <Button
    icon='pixelarticons:scale'
    style={{
      position: 'fixed',
      top: 5,
      left: 5,
      width: 22,
    }}
    onClick={() => {
      void document.documentElement.requestFullscreen()
    }}
  />
}
