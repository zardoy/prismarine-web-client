import { useEffect, useRef } from 'react'
import { f3Keybinds } from '../controls'
import { watchValue } from '../optionsStorage'
import { showModal, miscUiState, activeModalStack, hideCurrentModal } from '../globalState'
import { showOptionsModal } from './SelectOption'
import useLongPress from './useLongPress'
import styles from './MobileTopButtons.module.css'


export default () => {
  const elRef = useRef<HTMLDivElement | null>(null)

  /** @param {boolean} bl */
  const showMobileControls = (bl) => {
    if (elRef.current) elRef.current.style.display = bl ? 'flex' : 'none'
  }

  useEffect(() => {
    watchValue(miscUiState, o => {
      showMobileControls(o.currentTouch)
    })
  }, [])

  const onLongPress = async () => {
    const select = await showOptionsModal('', f3Keybinds.filter(f3Keybind => f3Keybind.mobileTitle).map(f3Keybind => f3Keybind.mobileTitle))
    console.log('pressed')
    console.log(select)
    if (!select) return
    const f3Keybind = f3Keybinds.find(f3Keybind => f3Keybind.mobileTitle === select)
    if (f3Keybind) f3Keybind.action()
  }

  const onClick = () => {
  }

  const defaultOptions = {
    shouldPreventDefault: true,
    delay: 500,
  }
  const longPressEvent = useLongPress(onLongPress, onClick, defaultOptions)

  // ios note: just don't use <button> 
  return <div ref={elRef} className={styles['mobile-top-btns']} id="mobile-top">
    <div className={styles['debug-btn']} onPointerDown={(e) => {
      window.dispatchEvent(new MouseEvent('mousedown', { button: 1 }))
    }}>S</div>
    <div className={styles['debug-btn']} onPointerDown={(e) => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'F3' }))
    }} { ...longPressEvent }>F3</div>
    <div className={styles['chat-btn']} onPointerDown={(e) => {
      e.stopPropagation()
      if (activeModalStack.at(-1)?.reactType === 'chat') {
        hideCurrentModal()
      } else {
        showModal({ reactType: 'chat' })
      }
    }}></div>
    <div className={styles['pause-btn']} onPointerDown={(e) => {
      e.stopPropagation()
      showModal({ reactType: 'pause-screen' })
    }}></div>
  </div>
}
