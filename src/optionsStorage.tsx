// todo implement async options storage

import { proxy, subscribe } from 'valtio/vanilla'
// weird webpack configuration bug: it cant import valtio/utils in this file
import { subscribeKey } from 'valtio/utils'
import { useState } from 'react'
import { useSnapshot } from 'valtio'
import { OptionMeta, OptionSlider } from './react/OptionsItems'
import Button from './react/Button'
import { openOptionsMenu } from './globalState'
import { openURL } from './menus/components/common'
import Slider from './react/Slider'
import { getScreenRefreshRate } from './utils'

const mergeAny: <T>(arg1: T, arg2: any) => T = Object.assign

const defaultOptions = {
  renderDistance: 4,
  closeConfirmation: true,
  autoFullScreen: false,
  mouseRawInput: false,
  autoExitFullscreen: false,
  localUsername: 'wanderer',
  mouseSensX: 50,
  mouseSensY: 50 as number | true,
  // mouseInvertX: false,
  chatWidth: 320,
  chatHeight: 180,
  chatScale: 100,
  volume: 50,
  // fov: 70,
  fov: 75,
  guiScale: 3,
  autoRequestCompletions: true,
  touchButtonsSize: 40,
  highPerformanceGpu: false,

  showChunkBorders: false,
  frameLimit: false as number | false,
  alwaysBackupWorldBeforeLoading: undefined as boolean | undefined | null,
  alwaysShowMobileControls: false,
  maxMultiplayerRenderDistance: null as number | null,
  excludeCommunicationDebugEvents: [],
  preventDevReloadWhilePlaying: false,
  numWorkers: 4,
  localServerOptions: {} as any,
  preferLoadReadonly: false,
  disableLoadPrompts: false,
  guestUsername: 'guest',
  askGuestName: true,

  // advanced bot options
  autoRespawn: false
}

export type AppOptions = typeof defaultOptions

export type OptionsGroupType = 'main' | 'render' | 'interface' | 'controls' | 'sound' | 'advanced'
// todo refactor to separate file like optionsGUI.tsx
export const guiOptionsScheme: {
  [t in OptionsGroupType]: Array<{ [k in keyof AppOptions]?: Partial<OptionMeta> } & { custom?}>
} = {
  render: [
    {
      renderDistance: {
        unit: '',
        min: 2,
        max: 16
      },
    },
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
        text: 'Use Dedicated GPU',
        // willHaveNoEffect: isIos
      },
    },
    {
      custom () {
        return <Button label='Guide: Disable VSync' onClick={() => openURL('https://gist.github.com/zardoy/6e5ce377d2b4c1e322e660973da069cd')} inScreen />
      },
    }
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
      custom () {
        return <Button label='Interface...' onClick={() => openOptionsMenu('interface')} inScreen />
      },
    },
    {
      custom () {
        return <Button label='Render...' onClick={() => openOptionsMenu('render')} inScreen />
      },
    },
    {
      custom () {
        return <Button label='Sound...' onClick={() => openOptionsMenu('sound')} inScreen />
      },
    },
    {
      custom () {
        return <Button label='Controls...' onClick={() => openOptionsMenu('controls')} inScreen />
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
      mouseRawInput: {},
      alwaysShowMobileControls: {
        text: 'Always Mobile Controls',
      },
      autoFullScreen: {
        tooltip: 'Auto Fullscreen allows you to use Ctrl+W and Escape having to wait/click on screen again.',
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
    { volume: {} }
  ],
  advanced: [

  ],
}

export const options = proxy(
  mergeAny(defaultOptions, JSON.parse(localStorage.options || '{}'))
)

window.options = window.settings = options

subscribe(options, () => {
  localStorage.options = JSON.stringify(options)
})

type WatchValue = <T extends Record<string, any>>(proxy: T, callback: (p: T) => void) => void

export const watchValue: WatchValue = (proxy, callback) => {
  const watchedProps = new Set<string>()
  callback(new Proxy(proxy, {
    get (target, p, receiver) {
      watchedProps.add(p.toString())
      return Reflect.get(target, p, receiver)
    },
  }))
  for (const prop of watchedProps) {
    subscribeKey(proxy, prop, () => {
      callback(proxy)
    })
  }
}

watchValue(options, o => {
  globalThis.excludeCommunicationDebugEvents = o.excludeCommunicationDebugEvents
})

export const useOptionValue = (setting, valueCallback) => {
  valueCallback(setting)
  subscribe(setting, valueCallback)
}
