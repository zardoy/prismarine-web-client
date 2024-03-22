// todo implement async options storage

import { proxy, subscribe } from 'valtio/vanilla'
// weird webpack configuration bug: it cant import valtio/utils in this file
import { subscribeKey } from 'valtio/utils'

const defaultOptions = {
  renderDistance: 2,
  multiplayerRenderDistance: 2,
  closeConfirmation: true,
  autoFullScreen: false,
  mouseRawInput: false,
  autoExitFullscreen: false,
  localUsername: 'wanderer',
  mouseSensX: 50,
  mouseSensY: -1,
  // mouseInvertX: false,
  chatWidth: 320,
  chatHeight: 180,
  chatScale: 100,
  chatOpacity: 100,
  chatOpacityOpened: 100,
  messagesLimit: 200,
  volume: 50,
  // fov: 70,
  fov: 75,
  guiScale: 3,
  autoRequestCompletions: true,
  touchButtonsSize: 40,
  touchButtonsOpacity: 80,
  touchButtonsPosition: 12,
  touchControlsPositions: {
    action: [
      90,
      70
    ],
    sneak: [
      90,
      90
    ],
    break: [
      70,
      70
    ]
  } as Record<string, [number, number]>,
  touchControlsType: 'classic' as 'classic' | 'joystick-buttons',
  gpuPreference: 'default' as 'default' | 'high-performance' | 'low-power',
  /** @unstable */
  disableAssets: false,
  /** @unstable */
  debugLogNotFrequentPackets: false,
  unimplementedContainers: false,
  dayCycleAndLighting: true,
  loadPlayerSkins: true,
  antiAliasing: false,

  showChunkBorders: false, // todo rename option
  frameLimit: false as number | false,
  alwaysBackupWorldBeforeLoading: undefined as boolean | undefined | null,
  alwaysShowMobileControls: false,
  excludeCommunicationDebugEvents: [],
  preventDevReloadWhilePlaying: false,
  numWorkers: 4,
  localServerOptions: {} as any,
  preferLoadReadonly: false,
  disableLoadPrompts: false,
  guestUsername: 'guest',
  askGuestName: true,
  /** Actually might be useful */
  showCursorBlockInSpectator: false,
  renderEntities: true,
  chatSelect: false,

  // advanced bot options
  autoRespawn: false,
  mutedSounds: [] as string[],
  plugins: [] as Array<{ enabled: boolean, name: string, description: string, script: string }>,
  /** Wether to popup sign editor on server action */
  autoSignEditor: true,
  wysiwygSignEditor: 'auto' as 'auto' | 'always' | 'never',
}

const migrateOptions = (options: Partial<AppOptions & Record<string, any>>) => {
  if (options.highPerformanceGpu) {
    options.gpuPreference = 'high-performance'
    delete options.highPerformanceGpu
  }
  if (Object.keys(options.touchControlsPositions ?? {}).length === 0) {
    options.touchControlsPositions = defaultOptions.touchControlsPositions
  }

  return options
}

export type AppOptions = typeof defaultOptions

export const options: AppOptions = proxy({
  ...defaultOptions,
  ...migrateOptions(JSON.parse(localStorage.options || '{}'))
})

window.options = window.settings = options

export const resetOptions = () => {
  Object.assign(options, defaultOptions)
}

Object.defineProperty(window, 'debugChangedOptions', {
  get () {
    return Object.fromEntries(Object.entries(options).filter(([key, v]) => defaultOptions[key] !== v))
  },
})

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

watchValue(options, o => {
  document.body.classList.toggle('disable-assets', o.disableAssets)
})
watchValue(options, o => {
  document.body.style.setProperty('--touch-movement-buttons-opacity', (o.touchButtonsOpacity / 100).toString())
})
watchValue(options, o => {
  document.body.style.setProperty('--touch-movement-buttons-position', (o.touchButtonsPosition * 2) + 'px')
})

export const useOptionValue = (setting, valueCallback) => {
  valueCallback(setting)
  subscribe(setting, valueCallback)
}
