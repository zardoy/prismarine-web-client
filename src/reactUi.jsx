//@ts-check
import { renderToDom } from '@zardoy/react-util'

import { LeftTouchArea, RightTouchArea, useUsingTouch, useInterfaceState } from '@dimaka/interface'
import { css } from '@emotion/css'
import { useSnapshot } from 'valtio'
import { QRCodeSVG } from 'qrcode.react'
import { createPortal } from 'react-dom'
import { contro } from './controls'
import { activeModalStack, miscUiState } from './globalState'
import { options, watchValue } from './optionsStorage'
import DeathScreenProvider from './react/DeathScreenProvider'
import OptionsRenderApp from './react/OptionsRenderApp'
import MainMenuRenderApp from './react/MainMenuRenderApp'
import SingleplayerProvider from './react/SingleplayerProvider'
import CreateWorldProvider from './react/CreateWorldProvider'
import AppStatusProvider from './react/AppStatusProvider'
import SelectOption from './react/SelectOption'
import EnterFullscreenButton from './react/EnterFullscreenButton'

// todo
useInterfaceState.setState({
  isFlying: false,
  uiCustomization: {
    touchButtonSize: 40,
  },
  updateCoord ([coord, state]) {
    const coordToAction = [
      ['z', -1, 'KeyW'],
      ['z', 1, 'KeyS'],
      ['x', -1, 'KeyA'],
      ['x', 1, 'KeyD'],
      ['y', 1, 'Space'], // todo jump
      ['y', -1, 'ShiftLeft'], // todo jump
    ]
    // todo refactor
    const actionAndState = state === 0 ? coordToAction.filter(([axis]) => axis === coord) : coordToAction.find(([axis, value]) => axis === coord && value === state)
    if (!bot) return
    if (state === 0) {
      // @ts-expect-error
      for (const action of actionAndState) {
        contro.pressedKeyOrButtonChanged({ code: action[2] }, false)
      }
    } else {
      //@ts-expect-error
      contro.pressedKeyOrButtonChanged({ code: actionAndState[2] }, true)
    }
  }
})

watchValue(options, (o) => {
  useInterfaceState.setState({
    uiCustomization: {
      touchButtonSize: o.touchButtonsSize,
    },
  })
})

const TouchControls = () => {
  // todo setting
  const usingTouch = useUsingTouch()
  const { usingGamepadInput } = useSnapshot(miscUiState)
  const modals = useSnapshot(activeModalStack)

  if (!usingTouch || usingGamepadInput) return null
  return (
    <div
      style={{ zIndex: modals.length ? 7 : 8 }}
      className={css`
        position: fixed;
        inset: 0;
        height: 100%;
        display: flex;
        width: 100%;
        justify-content: space-between;
        align-items: flex-end;
        pointer-events: none;
        touch-action: none;
        & > div {
            pointer-events: auto;
        }
    `}
    >
      <LeftTouchArea />
      <div />
      <RightTouchArea />
    </div>
  )
}

const Portal = ({ children, to }) => {
  return createPortal(children, to)
}

const DisplayQr = () => {
  const { currentDisplayQr } = useSnapshot(miscUiState)

  if (!currentDisplayQr) return null

  return <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 15
    }}
    onClick={() => {
      miscUiState.currentDisplayQr = null
    }}
  >
    <QRCodeSVG size={384} value={currentDisplayQr} style={{ display: 'block', border: '2px solid black' }} />
  </div>
}

const InGameUi = () => {
  const { gameLoaded } = useSnapshot(miscUiState)
  if (!gameLoaded) return

  return <>
    <Portal to={document.querySelector('#ui-root')}>
      {/* apply scaling */}
      <DeathScreenProvider />
    </Portal>
    <DisplayQr />
    <Portal to={document.body}>
      {/* becaues of z-index */}
      <TouchControls />
    </Portal>
  </>
}

const App = () => {
  return <div>
    <EnterFullscreenButton />
    <InGameUi />
    <Portal to={document.querySelector('#ui-root')}>
      <SingleplayerProvider />
      <CreateWorldProvider />
      <AppStatusProvider />
      <SelectOption />
      <OptionsRenderApp />
      <MainMenuRenderApp />
    </Portal>
  </div>
}

renderToDom(<App />, {
  strictMode: false,
  selector: '#react-root',
})
