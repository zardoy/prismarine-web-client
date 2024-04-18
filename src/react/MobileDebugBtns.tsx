import { useEffect, useRef } from 'react'
import { f3Keybinds } from '../controls'
import { watchValue } from '../optionsStorage'
import { showModal, miscUiState, activeModalStack, hideCurrentModal } from '../globalState'
import { showOptionsModal } from './SelectOption'
import useLongPress from './useLongPress'
import styles from './MobileDebugBtns.module.css'


export default () => {
  const elRef = useRef<HTMLDivElement | null>(null)

  /** @param {boolean} bl */
  const showMobileControls = (bl) => {
    if (elRef.current) elRef.current.style.display = bl ? 'flex' : 'none'
  }

  useEffect(() => {
    watchValue(miscUiState, o => {
      showMobileControls(o.currentTouch)
      // //@ts-expect-error
      // this.shadowRoot.host.style.display = o.gameLoaded ? 'block' : 'none'
    })
  }, [])

  const onLongPress = async (event: TouchEvent) => {
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
      const event = new KeyboardEvent('keydown', {
        code: 'F3', // Specify the key you want to press
        keyCode: 114, // Specify the key code if needed
        which: 114, // Specify the which property if needed
        ctrlKey: false, // Whether ctrl key is pressed
        shiftKey: false, // Whether shift key is pressed
        altKey: false, // Whether alt key is pressed
        metaKey: false, // Whether meta key (e.g., Command key on Mac) is pressed
      });

      // Dispatch the event on the document or any other element
      document.dispatchEvent(event);
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
