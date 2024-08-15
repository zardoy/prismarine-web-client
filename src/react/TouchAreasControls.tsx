import { CSSProperties, PointerEvent, useEffect, useRef } from 'react'
import { proxy, ref, useSnapshot } from 'valtio'
import { contro } from '../controls'
import worldInteractions from '../worldInteractions'
import PixelartIcon from './PixelartIcon'
import Button from './Button'

export type ButtonName = 'action' | 'sneak' | 'break' | 'jump'

type ButtonsPositions = Record<ButtonName, [number, number]>

interface Props {
  touchActive: boolean
  setupActive: boolean
  buttonsPositions: ButtonsPositions
  closeButtonsSetup: (newPositions?: ButtonsPositions) => void
}

const getCurrentAppScaling = () => {
  // body has css property --guiScale
  const guiScale = getComputedStyle(document.body).getPropertyValue('--guiScale')
  return parseFloat(guiScale)
}

export const joystickPointer = proxy({
  pointer: null as { x: number, y: number, pointerId: number } | null,
  joystickInner: null as HTMLDivElement | null,
})

export const handleMovementStickDelta = (e?: { clientX, clientY }) => {
  const max = 32
  let x = 0
  let y = 0
  if (e) {
    const scale = getCurrentAppScaling()
    x = e.clientX - joystickPointer.pointer!.x
    y = e.clientY - joystickPointer.pointer!.y
    x = Math.min(Math.max(x, -max), max) / scale
    y = Math.min(Math.max(y, -max), max) / scale
  }

  joystickPointer.joystickInner!.style.transform = `translate(${x}px, ${y}px)`
  const vector = {
    x: x / max,
    y: 0,
    z: y / max,
  }
  void contro.emit('movementUpdate', {
    vector,
    soleVector: vector
  })
}

export default ({ touchActive, setupActive, buttonsPositions, closeButtonsSetup }: Props) => {
  const bot = window.bot as typeof __type_bot | undefined
  if (setupActive) touchActive = true

  const joystickOuter = useRef<HTMLDivElement>(null)
  const joystickInner = useRef<HTMLDivElement>(null)

  const { pointer } = useSnapshot(joystickPointer)
  // const { isFlying, isSneaking } = useSnapshot(gameAdditionalState)
  const newButtonPositions = { ...buttonsPositions }

  const buttonProps = (name: ButtonName) => {
    let active = {
      action: false,
      sneak: bot?.getControlState('sneak'),
      break: false,
      jump: bot?.getControlState('jump'),
    }[name]
    const holdDown = {
      action () {
        document.dispatchEvent(new MouseEvent('mousedown', { button: 2 }))
        worldInteractions.update()
      },
      sneak () {
        void contro.emit('trigger', {
          command: 'general.toggleSneakOrDown',
          schema: null as any,
        })
        active = bot?.getControlState('sneak')
      },
      break () {
        document.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))
        worldInteractions.update()
        active = true
      },
      jump () {
        void contro.emit('trigger', {
          command: 'general.jump',
          schema: null as any,
        })
        active = bot?.controlState.jump
      }
    }
    const holdUp = {
      action () {
        document.dispatchEvent(new MouseEvent('mouseup', { button: 2 }))
      },
      sneak () {
        void contro.emit('release', {
          command: 'general.toggleSneakOrDown',
          schema: null as any,
        })
        active = bot?.getControlState('sneak')
      },
      break () {
        document.dispatchEvent(new MouseEvent('mouseup', { button: 0 }))
        worldInteractions.update()
        active = false
      },
      jump () {
        void contro.emit('release', {
          command: 'general.jump',
          schema: null as any,
        })
        active = bot?.controlState.jump
      }
    }

    type PType = PointerEvent<HTMLDivElement>
    const pointerup = (e: PType) => {
      const elem = e.currentTarget as HTMLElement
      console.log(e.type, elem.hasPointerCapture(e.pointerId))
      elem.releasePointerCapture(e.pointerId)
      if (!setupActive) {
        holdUp[name]()
        pointerToggledUpdate(e)
      }
    }
    const pointerToggledUpdate = (e) => {
      e.currentTarget.style.background = active ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)'
    }
    let setupPointer = null as { x, y } | null
    return {
      style: {
        position: 'fixed',
        left: `${buttonsPositions[name][0]}%`,
        top: `${buttonsPositions[name][1]}%`,
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        background: active ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'background 0.1s',
      } satisfies CSSProperties,
      onPointerDown (e: PType) {
        const elem = e.currentTarget as HTMLElement
        elem.setPointerCapture(e.pointerId)
        if (setupActive) {
          setupPointer = { x: e.clientX, y: e.clientY }
        } else {
          holdDown[name]()
          pointerToggledUpdate(e)
        }
      },
      onPointerMove (e: PType) {
        if (setupPointer) {
          const elem = e.currentTarget as HTMLElement
          const size = 32
          const scale = getCurrentAppScaling()
          const xPerc = (e.clientX - size / 4 / scale) / window.innerWidth * 100
          const yPerc = (e.clientY - size / 4 / scale) / window.innerHeight * 100
          elem.style.left = `${xPerc}%`
          elem.style.top = `${yPerc}%`
          newButtonPositions[name] = [xPerc, yPerc]
        }
      },
      onPointerUp: pointerup,
      // onPointerCancel: pointerup,
      onLostPointerCapture: pointerup,
    }
  }

  useEffect(() => {
    joystickPointer.joystickInner = joystickInner.current && ref(joystickInner.current)
    // todo antipattern
  }, [touchActive])

  if (!touchActive) return null

  return <div>
    <div
      className='movement_joystick_outer'
      ref={joystickOuter}
      style={{
        display: pointer ? 'flex' : 'none',
        borderRadius: '50%',
        width: 50,
        height: 50,
        border: '2px solid rgba(0, 0, 0, 0.5)',
        backgroundColor: 'rgba(255, 255, div, 0.5)',
        position: 'fixed',
        justifyContent: 'center',
        alignItems: 'center',
        translate: '-50% -50%',
        ...pointer ? {
          left: `${pointer.x / window.innerWidth * 100}%`,
          top: `${pointer.y / window.innerHeight * 100}%`
        } : {}
      }}
    >
      <div
        className='movement_joystick_inner'
        style={{
          borderRadius: '50%',
          width: 20,
          height: 20,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          position: 'absolute',
        }}
        ref={joystickInner}
      />
    </div>
    <div {...buttonProps('action')}>
      <PixelartIcon iconName='circle' />
    </div>
    <div {...buttonProps('sneak')}>
      <PixelartIcon iconName='arrow-down' />
    </div>
    <div {...buttonProps('jump')}>
      <PixelartIcon iconName='arrow-up' />
    </div>
    <div {...buttonProps('break')}>
      <MineIcon />
    </div>
    {setupActive && <div style={{
      position: 'fixed',
      bottom: 0,
      display: 'flex',
      justifyContent: 'center',
      gap: 3
    }}
    >
      <Button onClick={() => {
        closeButtonsSetup()
      }}
      >Cancel
      </Button>
      <Button onClick={() => {
        closeButtonsSetup(newButtonPositions)
      }}
      >Apply
      </Button>
    </div>}
  </div>
}

const MineIcon = () => {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26" width={22} height={22}>
    <path d="M 8 0 L 8 2 L 18 2 L 18 0 L 8 0 z M 18 2 L 18 4 L 20 4 L 20 6 L 22 6 L 22 8 L 24 8 L 24 2 L 22 2 L 18 2 z M 24 8 L 24 18 L 26 18 L 26 8 L 24 8 z M 24 18 L 22 18 L 22 20 L 24 20 L 24 18 z M 22 18 L 22 10 L 20 10 L 20 18 L 22 18 z M 20 10 L 20 8 L 18 8 L 18 10 L 20 10 z M 18 10 L 16 10 L 16 12 L 18 12 L 18 10 z M 16 12 L 14 12 L 14 14 L 16 14 L 16 12 z M 14 14 L 12 14 L 12 16 L 14 16 L 14 14 z M 12 16 L 10 16 L 10 18 L 12 18 L 12 16 z M 10 18 L 8 18 L 8 20 L 10 20 L 10 18 z M 8 20 L 6 20 L 6 22 L 8 22 L 8 20 z M 6 22 L 4 22 L 4 24 L 6 24 L 6 22 z M 4 24 L 2 24 L 2 22 L 0 22 L 0 24 L 0 26 L 2 26 L 4 26 L 4 24 z M 2 22 L 4 22 L 4 20 L 2 20 L 2 22 z M 4 20 L 6 20 L 6 18 L 4 18 L 4 20 z M 6 18 L 8 18 L 8 16 L 6 16 L 6 18 z M 8 16 L 10 16 L 10 14 L 8 14 L 8 16 z M 10 14 L 12 14 L 12 12 L 10 12 L 10 14 z M 12 12 L 14 12 L 14 10 L 12 10 L 12 12 z M 14 10 L 16 10 L 16 8 L 14 8 L 14 10 z M 16 8 L 18 8 L 18 6 L 16 6 L 16 8 z M 16 6 L 16 4 L 8 4 L 8 6 L 16 6 z M 8 4 L 8 2 L 6 2 L 6 4 L 8 4 z" stroke='white' />
  </svg>
}
