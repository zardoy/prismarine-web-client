import { useEffect, useRef, useState } from 'react'
import { Transition } from 'react-transition-group'
import { getItemNameRaw, openItemsCanvas, openPlayerInventory, upInventoryItems } from '../playerWindows'
import { isGameActive, miscUiState } from '../globalState'
import MessageFormattedString from './MessageFormattedString'
import SharedHudVars from './SharedHudVars'


const ItemName = ({ itemKey }: { itemKey: string }) => {
  const nodeRef = useRef(null)
  const [show, setShow] = useState(false)
  const [itemName, setItemName] = useState<Record<string, any> | string>('')

  const duration = 300

  const defaultStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 'calc(var(--safe-area-inset-bottom) + 50px)',
    left: 0,
    right: 0,
    fontSize: 10,
    textAlign: 'center',
    transition: `opacity ${duration}ms ease-in-out`,
    opacity: 0,
    pointerEvents: 'none',
  }

  const transitionStyles = {
    entering: { opacity: 1 },
    entered:  { opacity: 1 },
    exiting:  { opacity: 0 },
    exited:  { opacity: 0 },
  }

  useEffect(() => {
    const itemData = itemKey.split('_split_')
    if (!itemKey) {
      setItemName('')
    } else if (itemData[3]) {
      const customDisplay = getItemNameRaw({
        nbt: JSON.parse(itemData[3]),
      })
      if (customDisplay) {
        setItemName(customDisplay)
      } else {
        setItemName(itemData[0])
      }
    } else {
      setItemName(itemData[0])
    }
    setShow(true)
    const id = setTimeout(() => {
      setShow(false)
    }, 1500)
    return () => {
      setShow(false)
      clearTimeout(id)
    }
  }, [itemKey])

  return <Transition nodeRef={nodeRef} in={show} timeout={duration} >
    {state => (
      <div ref={nodeRef} style={{ ...defaultStyle, ...transitionStyles[state] }} className='item-display-name'>
        <MessageFormattedString message={itemName} />
      </div>
    )}
  </Transition>
}

export default () => {
  const container = useRef<HTMLDivElement>(null!)
  const [itemKey, setItemKey] = useState('')

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
    const upHotbarItems = () => {
      if (!viewer.world.downloadedTextureImage && !viewer.world.customTexturesDataUrl) return
      upInventoryItems(true, inv)
    }
    globalThis.upHotbarItems = upHotbarItems

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

    bot.inventory.on('updateSlot', upHotbarItems)
    viewer.world.renderUpdateEmitter.on('textureDownloaded', upHotbarItems)

    const setSelectedSlot = (index: number) => {
      if (index === bot.quickBarSlot) return
      bot.setQuickBarSlot(index)
      if (!bot.inventory.slots?.[bot.quickBarSlot + 36]) setItemKey('')
    }
    const heldItemChanged = () => {
      inv.inventory.activeHotbarSlot = bot.quickBarSlot

      if (!bot.inventory.slots?.[bot.quickBarSlot + 36]) return
      const item = bot.inventory.slots[bot.quickBarSlot + 36]!
      const itemNbt = item.nbt ? JSON.stringify(item.nbt) : ''
      setItemKey(`${item.displayName}_split_${item.type}_split_${item.metadata}_split_${itemNbt}`)
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
    <ItemName itemKey={itemKey} />
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
