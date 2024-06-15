//@ts-check
import { renderToDom, ErrorBoundary } from '@zardoy/react-util'
import { useSnapshot } from 'valtio'
import { QRCodeSVG } from 'qrcode.react'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { activeModalStack, miscUiState } from './globalState'
import DeathScreenProvider from './react/DeathScreenProvider'
import OptionsRenderApp from './react/OptionsRenderApp'
import MainMenuRenderApp from './react/MainMenuRenderApp'
import SingleplayerProvider from './react/SingleplayerProvider'
import CreateWorldProvider from './react/CreateWorldProvider'
import AppStatusProvider from './react/AppStatusProvider'
import SelectOption from './react/SelectOption'
import EnterFullscreenButton from './react/EnterFullscreenButton'
import ChatProvider from './react/ChatProvider'
import TitleProvider from './react/TitleProvider'
import ScoreboardProvider from './react/ScoreboardProvider'
import SignEditorProvider from './react/SignEditorProvider'
import IndicatorEffectsProvider from './react/IndicatorEffectsProvider'
import PlayerListOverlayProvider from './react/PlayerListOverlayProvider'
import MinimapProvider from './react/MinimapProvider'
import HudBarsProvider from './react/HudBarsProvider'
import XPBarProvider from './react/XPBarProvider'
import DebugOverlay from './react/DebugOverlay'
import MobileTopButtons from './react/MobileTopButtons'
import PauseScreen from './react/PauseScreen'
import SoundMuffler from './react/SoundMuffler'
import TouchControls from './react/TouchControls'
import widgets from './react/widgets'
import { useIsWidgetActive } from './react/utilsApp'
import GlobalSearchInput from './GlobalSearchInput'
import TouchAreasControlsProvider from './react/TouchAreasControlsProvider'
import NotificationProvider, { showNotification } from './react/NotificationProvider'
import HotbarRenderApp from './react/HotbarRenderApp'
import Crosshair from './react/Crosshair'
import ButtonAppProvider from './react/ButtonAppProvider'
import ServersListProvider from './react/ServersListProvider'
import GamepadUiCursor from './react/GamepadUiCursor'
import KeybindingsScreenProvider from './react/KeybindingsScreenProvider'
import HeldMapUi from './react/HeldMapUi'
import BedTime from './react/BedTime'

const RobustPortal = ({ children, to }) => {
  return createPortal(<PerComponentErrorBoundary>{children}</PerComponentErrorBoundary>, to)
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

// mounted earlier than ingame ui TODO
const GameHud = ({ children }) => {
  const { loadedDataVersion } = useSnapshot(miscUiState)
  const [gameLoaded, setGameLoaded] = useState(false)

  useEffect(() => {
    customEvents.on('mineflayerBotCreated', () => {
      bot.once('inject_allowed', () => {
        setGameLoaded(true)
      })
    })
  }, [])
  useEffect(() => {
    if (!loadedDataVersion) setGameLoaded(false)
  }, [loadedDataVersion])

  return gameLoaded ? children : null
}

const InGameComponent = ({ children }) => {
  const { gameLoaded } = useSnapshot(miscUiState)
  if (!gameLoaded) return null
  return children
}

const InGameUi = () => {
  const { gameLoaded, showUI: showUIRaw } = useSnapshot(miscUiState)
  const hasModals = useSnapshot(activeModalStack).length > 0
  const showUI = showUIRaw || hasModals
  if (!gameLoaded || !bot) return

  return <>
    <RobustPortal to={document.querySelector('#ui-root')}>
      {/* apply scaling */}
      <div style={{ display: showUI ? 'block' : 'none' }}>
        <DeathScreenProvider />
        <DebugOverlay />
        <MobileTopButtons />
        <PlayerListOverlayProvider />
        <ChatProvider />
        <SoundMuffler />
        <TitleProvider />
        <ScoreboardProvider />
        <IndicatorEffectsProvider />
        <Crosshair />
        <MinimapProvider />
        <TouchAreasControlsProvider />
      </div>

      <PauseScreen />
      <div style={{ display: showUI ? 'block' : 'none' }}>
        <XPBarProvider />
        <HudBarsProvider />
        <BedTime />
      </div>
      {showUI && <HotbarRenderApp />}
    </RobustPortal>
    <PerComponentErrorBoundary>
      <SignEditorProvider />
      <DisplayQr />
    </PerComponentErrorBoundary>
    <RobustPortal to={document.body}>
      {/* because of z-index */}
      {showUI && <TouchControls />}
      <GlobalSearchInput />
    </RobustPortal>
  </>
}

const AllWidgets = () => {
  return widgets.map(widget => <WidgetDisplay key={widget.name} name={widget.name} Component={widget.default} />)
}

const WidgetDisplay = ({ name, Component }) => {
  const isWidgetActive = useIsWidgetActive(name)
  if (!isWidgetActive) return null

  return <Component />
}

const App = () => {
  return <div>
    <ButtonAppProvider>
      <RobustPortal to={document.body}>
        <div className='overlay-bottom-scaled'>
          <InGameComponent>
            <HeldMapUi />
          </InGameComponent>
        </div>
        <div></div>
      </RobustPortal>
      <EnterFullscreenButton />
      <InGameUi />
      <RobustPortal to={document.querySelector('#ui-root')}>
        <AllWidgets />
        <SingleplayerProvider />
        <CreateWorldProvider />
        <AppStatusProvider />
        <KeybindingsScreenProvider />
        <SelectOption />
        <ServersListProvider />
        <OptionsRenderApp />
        <MainMenuRenderApp />
        <NotificationProvider />
        {/* <GameHud>
        </GameHud> */}
      </RobustPortal>
      <RobustPortal to={document.body}>
        {/* todo correct mounting! */}
        <div className='overlay-top-scaled'>
          <GamepadUiCursor />
        </div>
        <div></div>
      </RobustPortal>
    </ButtonAppProvider>
  </div>
}

const PerComponentErrorBoundary = ({ children }) => {
  return children.map((child, i) => <ErrorBoundary key={i} renderError={(error) => {
    const componentNameClean = (child.type.name || child.type.displayName || 'Unknown').replaceAll(/__|_COMPONENT/g, '')
    showNotification(`UI component ${componentNameClean} crashed!`, 'Please report this. Use console to see more info.', true, undefined)
    return null
  }}>{child}</ErrorBoundary>)
}

renderToDom(<App />, {
  strictMode: false,
  selector: '#react-root',
})

disableReactProfiling()
function disableReactProfiling () {
  //@ts-expect-error
  window.performance.markOrig = window.performance.mark
  //@ts-expect-error
  window.performance.mark = (name, options) => {
    // ignore react internal marks
    if (!name.startsWith('⚛') && !localStorage.enableReactProfiling) {
      //@ts-expect-error
      window.performance.markOrig(name, options)
    }
  }
}
