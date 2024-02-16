import { CSSProperties, useEffect, useRef, useState } from 'react'
import PixelartIcon from './PixelartIcon'

export type Button = 'action' | 'sneak' | 'break'

export default ({ touchActive, setupActive, buttonsPositions }) => {
  if (setupActive) touchActive = true

  const [joystickPosition, setJoystickPosition] = useState(null as { x, y, pointerId } | null)

  useEffect(() => {
    if (!touchActive) return
    const controller = new AbortController()
    const { signal } = controller
    addEventListener('pointerdown', (e) => {
      if (e.pointerId === joystickPosition?.pointerId) {
        const x = e.clientX - joystickPosition.x
        const y = e.clientY - joystickPosition.y
        const supportsPressure = (e as any).pressure !== undefined && (e as any).pressure !== 0 && (e as any).pressure !== 0.5 && (e as any).pressure !== 1 && (e.pointerType === 'touch' || e.pointerType === 'pen')
        if ((e as any).pressure > 0.5) {
        }


        return
      }

      if (e.clientX < window.innerWidth / 2) {
        setJoystickPosition({
          x: e.clientX,
          y: e.clientY,
          pointerId: e.pointerId,
        })
      }
    }, {
      signal,
    })
    return () => {
      controller.abort()
    }
  }, [touchActive])

  buttonsPositions = {
    // 0-100
    action: {
      x: 90,
      y: 70
    },
    sneak: {
      x: 90,
      y: 90
    },
    break: {
      x: 70,
      y: 70
    }
  }

  const buttonStyles = (name: Button) => ({
    padding: 10,
    position: 'fixed',
    left: `${buttonsPositions[name].x}%`,
    top: `${buttonsPositions[name].y}%`,
    borderRadius: '50%',
  } satisfies CSSProperties)

  return <div>
    <div
      className='movement_joystick_outer'
      style={{
        display: joystickPosition ? 'block' : 'none',
        borderRadius: '50%',
        width: 50,
        height: 50,
        border: '2px solid rgba(0, 0, 0, 0.5)',
        backgroundColor: 'rgba(255, 255, div, 0.5)',
        position: 'fixed',
        left: joystickPosition?.x,
        top: joystickPosition?.y,
      }}>
      <div
        className='movement_joystick_inner'
        style={{
          borderRadius: '50%',
          width: 20,
          height: 20,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          position: 'absolute',

        }}
      />
    </div>
    <div style={buttonStyles('action')}>
      <PixelartIcon width={10} iconName='circle' />
    </div>
    <div style={buttonStyles('sneak')}>
      <PixelartIcon width={10} iconName='arrow-down' />
    </div>
    <div style={buttonStyles('break')}>
      <PixelartIcon width={10} iconName='arrow-down' />
    </div>
  </div>
}
