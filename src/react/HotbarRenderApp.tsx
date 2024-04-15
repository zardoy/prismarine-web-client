import { useEffect, useRef, useState } from 'react'
import { Transition } from 'react-transition-group'
import { openItemsCanvas, openPlayerInventory, upInventoryItems } from '../playerWindows'
import { isGameActive, miscUiState } from '../globalState'
import SharedHudVars from './SharedHudVars'


const ItemName = ({ slotIndex }: { slotIndex: number }) => {
  const nodeRef = useRef(null)
  const [show, setShow] = useState(false)
  const [itemName, setItemName] = useState('')

  const duration = 300

  const defaultStyle = {
    position: 'fixed', 
    bottom: 'calc(var(--safe-area-inset-bottom) + 50px)',
    left: 0,
    right: 0,
    fontSize: '0.5rem',
    textAlign: 'center',
    transition: `opacity ${duration}ms ease-in-out`,
    opacity: 0,
  }

  const transitionStyles = {
    entering: { opacity: 1 },
    entered:  { opacity: 1 },
    exiting:  { opacity: 0 },
    exited:  { opacity: 0 },
  }

  useEffect(() => {
    if (bot.inventory.slots) {
      const item = bot.inventory.slots[slotIndex]
      if (item) {
        setItemName(prev => item.displayName)
        setShow(prev => true)
        const id = setTimeout(() => {
          setShow(prev => false)
        }, 1500)
        return () => {
          setShow(prev => false)
          clearTimeout(id)
        }
      } else {
        setItemName(prev => '')
      }
    }
  }, [slotIndex])

  return <Transition nodeRef={nodeRef} in={show} timeout={duration} >
    {state => (
      <div ref={nodeRef} style={{ ...defaultStyle, ...transitionStyles[state] }}>
        {itemName}
      </div>
    )}
  </Transition>
}

export default () => {
  const container = useRef<HTMLDivElement>(null!)
  const [slotIndex, setSlotIndex] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    const inv = openItemsCanvas('HotbarWin', {
      clickWindow (slot, mouseButton, mode) {
        // todo fix in canvas
        // if (slot < 32 || slot > 40) return
        // bot.setQuickBarSlot(32 - slot)
      },
    } as any)
    const { canvasManager } = inv
    inv.inventory.supportsOffhand = bot.supportFeature('doesntHaveOffHandSlot')

    canvasManager.minimizedWindow = true
    canvasManager.minimizedWindow = true
    canvasManager.scale = 1
    canvasManager.windowHeight = 25
    canvasManager.windowWidth = 210 - (inv.inventory.supportsOffhand ? 0 : 25) + (miscUiState.currentTouch ? 28 : 0)
    container.current.appendChild(inv.canvas)
    const upWindowItems = () => {
      upInventoryItems(true, inv)
    }

    canvasManager.canvas.onpointerdown = (e) => {
      if (!isGameActive(true)) return
      const slot = inv.canvasManager.getMousePos(inv.canvas, e)
      // take offhand into account
      if (inv.inventory.supportsOffhand) slot.x -= 25
      let xSlot = Math.floor((slot.x - 1) / 35)
      if (xSlot === 11) {
        openPlayerInventory()
        return
      }
      if (xSlot < 0 || xSlot > 9) return
      if (xSlot === 9) xSlot = 8 // todo use native canvas events!
      bot.setQuickBarSlot(xSlot)
    }

    bot.inventory.on('updateSlot', upWindowItems)

    const setSelectedSlot = (index: number) => {
      if (index === bot.quickBarSlot) return
      setSlotIndex(prev => index + 36)
      bot.setQuickBarSlot(index)
    }
    const heldItemChanged = () => {
      // todo! display selected block text (on active hotbar item slot replace as well)
      inv.inventory.activeHotbarSlot = bot.quickBarSlot
      // render
    }
    heldItemChanged()
    bot.on('heldItemChanged' as any, heldItemChanged)

    document.addEventListener('wheel', (e) => {
      if (!isGameActive(true)) return
      e.preventDefault()
      const newSlot = ((bot.quickBarSlot + Math.sign(e.deltaY)) % 9 + 9) % 9
      setSelectedSlot(newSlot)
    }, {
      passive: false,
      signal: controller.signal
    })

    document.addEventListener('keydown', (e) => {
      if (!isGameActive(true)) return
      const numPressed = +((/Digit(\d)/.exec(e.code))?.[1] ?? -1)
      if (numPressed < 1 || numPressed > 9) return
      setSelectedSlot(numPressed - 1)
    }, {
      passive: false,
    })

    return () => {
      inv.destroy()
      controller.abort()
      // bot.inventory.off('updateSlot', upWindowItems)
    }
  }, [])

  return <SharedHudVars> 
    <ItemName slotIndex={slotIndex} />
    <div className='hotbar' ref={container} style={{
      position: 'fixed',
      bottom: 'calc(var(--safe-area-inset-bottom))',
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      zIndex: -1,
    }} />
  </SharedHudVars>
}
