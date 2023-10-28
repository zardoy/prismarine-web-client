import { useState } from 'react'
import { useSnapshot } from 'valtio'
import { isGameActive, openOptionsMenu } from './globalState'
import { openURL } from './menus/components/common'
import { AppOptions, options } from './optionsStorage'
import Button from './react/Button'
import { OptionMeta } from './react/OptionsItems'
import Slider from './react/Slider'
import { getScreenRefreshRate, openFilePicker, setLoadingScreenStatus } from './utils'
import { getResourcePackName, resourcePackState, uninstallTexturePack } from './texturePack'
import { fsState } from './loadSave'
import { resetLocalStorageWithoutWorld } from './browserfs'

export const guiOptionsScheme: {
  [t in OptionsGroupType]: Array<{ [k in keyof AppOptions]?: Partial<OptionMeta> } & { custom?}>
} = {
  render: [
    {
      custom () {
        const frameLimitValue = useSnapshot(options).frameLimit
        const [frameLimitMax, setFrameLimitMax] = useState(null as number | null)

        return <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Slider style={{ width: 130 }} label='Frame Limit' disabledReason={frameLimitMax ? undefined : 'press lock button first'} unit={frameLimitValue ? 'fps' : ''} valueDisplay={frameLimitValue || 'VSync'} value={frameLimitValue || frameLimitMax + 1} min={20} max={frameLimitMax + 1} updateValue={(newVal) => {
            options.frameLimit = newVal > frameLimitMax ? false : newVal
          }} />
          <Button style={{ width: 20 }} icon='pixelarticons:lock-open' onClick={async () => {
            const rate = await getScreenRefreshRate()
            setFrameLimitMax(rate)
          }} />
        </div>
      }
    },
    {
      highPerformanceGpu: {
        // todo reimplement to gpu preference to allow use low-energy instead
        text: 'Use Dedicated GPU',
        // willHaveNoEffect: isIos
      },
    },
    {
      custom () {
        return <Button label='Guide: Disable VSync' onClick={() => openURL('https://gist.github.com/zardoy/6e5ce377d2b4c1e322e660973da069cd')} inScreen />
      },
    },
    {
      custom () {
        return <>
          <div></div>
          <span style={{ fontSize: 9, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Experimental</span>
          <div></div>
        </>
      },
      dayCycleAndLighting: {
        text: 'Day Cycle',
      }
    },
  ],
  main: [
    // renderDistance
    {
      fov: {
        min: 30,
        max: 110,
        unit: '',
      }
    },
    {
      renderDistance: {
        unit: '',
        min: 1,
        max: 16
      },
    },
    {
      custom () {
        return <Button label='Render...' onClick={() => openOptionsMenu('render')} inScreen />
      },
    },
    {
      custom () {
        return <Button label='Interface...' onClick={() => openOptionsMenu('interface')} inScreen />
      },
    },
    {
      custom () {
        return <Button label='Controls...' onClick={() => openOptionsMenu('controls')} inScreen />
      },
    },
    {
      custom () {
        return <Button label='Sound...' onClick={() => openOptionsMenu('sound')} inScreen />
      },
    },
    {
      custom () {
        const { resourcePackInstalled } = useSnapshot(resourcePackState)
        return <Button label={`Resource Pack... ${resourcePackInstalled ? 'ON' : 'OFF'}`} inScreen onClick={async () => {
          if (resourcePackState.resourcePackInstalled) {
            const resourcePackName = await getResourcePackName()
            if (confirm(`Uninstall ${resourcePackName} resource pack?`)) {
              // todo make hidable
              setLoadingScreenStatus('Uninstalling texturepack...')
              await uninstallTexturePack()
              setLoadingScreenStatus(undefined)
            }
          } else {
            // if (!fsState.inMemorySave && isGameActive(false)) {
            //   alert('Unable to install resource pack in loaded save for now')
            //   return
            // }
            openFilePicker('resourcepack')
          }
        }} />
      },
    },
    {
      custom () {
        return <Button label='Advanced...' onClick={() => openOptionsMenu('advanced')} inScreen />
      },
    }
  ],
  interface: [
    {
      guiScale: {
        max: 4,
        unit: '',
        delayApply: true,
      },
      chatWidth: {
        max: 320,
        unit: 'px',
      },
      chatHeight: {
        max: 180,
        unit: 'px',
      },
    }
  ],
  controls: [
    {
      // keybindings
      mouseSensX: {},
      mouseSensY: {},
      mouseRawInput: {
        tooltip: 'Wether to disable any mouse acceleration (MC does it by default). Most probably it is still supported only by Chrome.',
        disabledReason: document.documentElement.requestPointerLock ? undefined : 'Your browser does not support pointer lock.',
      },
      alwaysShowMobileControls: {
        text: 'Always Mobile Controls',
      },
      autoFullScreen: {
        tooltip: 'Auto Fullscreen allows you to use Ctrl+W and Escape having to wait/click on screen again.',
        disabledReason: navigator['keyboard'] ? undefined : 'Your browser doesn\'t support keyboard lock API'
      },
      autoExitFullscreen: {
        tooltip: 'Exit fullscreen on escape (pause menu open). But note you can always do it with F11.',
      },
      touchButtonsSize: {
        min: 40
      }
    }
  ],
  sound: [
    { volume: {} },
    // { ignoreSilentSwitch: {} },
  ],
  advanced: [
    {
      custom () {
        return <Button inScreen onClick={() => {
          if (confirm('Are you sure you want to reset all settings?')) resetLocalStorageWithoutWorld()
        }}>Reset all settings</Button>
      },
    }
  ],
}
export type OptionsGroupType = 'main' | 'render' | 'interface' | 'controls' | 'sound' | 'advanced'
