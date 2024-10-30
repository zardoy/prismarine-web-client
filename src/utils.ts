import { activeModalStack, hideModal, isGameActive, miscUiState, showModal } from './globalState'
import { options } from './optionsStorage'
import { appStatusState, resetAppStatusState } from './react/AppStatusProvider'
import { notificationProxy, showNotification } from './react/NotificationProvider'

export const goFullscreen = async (doToggle = false) => {
  if (!document.fullscreenElement) {
    // todo display a message or repeat?
    await document.documentElement.requestFullscreen().catch(() => { })
    // request full keyboard access
    await navigator.keyboard?.lock?.(['Escape', 'KeyW'])
  } else if (doToggle) {
    await document.exitFullscreen().catch(() => { })
  }
}

export const toNumber = val => {
  const num = Number(val)
  return isNaN(num) ? undefined : num
}

export const inGameError = err => {
  console.error(err)
  window.reportError?.(err)
  // todo report
  miscUiState.hasErrors = true
}

export const pointerLock = {
  get hasPointerLock () {
    return document.pointerLockElement
  },
  justHitEscape: false,
  async requestPointerLock () {
    if (!isGameActive(true) || !document.documentElement.requestPointerLock || miscUiState.currentTouch) {
      return
    }
    if (options.autoFullScreen) {
      void goFullscreen()
    }
    const displayBrowserProblem = () => {
      showNotification('Browser Delay Limitation', navigator['keyboard'] ? 'Click on screen, enable Auto Fullscreen or F11' : 'Click on screen or use fullscreen in Chrome')
      notificationProxy.id = 'pointerlockchange'
    }
    if (!(document.fullscreenElement && navigator['keyboard']) && this.justHitEscape) {
      displayBrowserProblem()
    } else {
      //@ts-expect-error
      const promise: any = document.documentElement.requestPointerLock({
        unadjustedMovement: options.mouseRawInput
      })
      promise?.catch(error => {
        if (error.name === 'NotSupportedError') {
          // Some platforms may not support unadjusted movement, request again a regular pointer lock.
          document.documentElement.requestPointerLock()
        } else if (error.name === 'SecurityError') {
          // cause: https://discourse.threejs.org/t/how-to-avoid-pointerlockcontrols-error/33017/4
          displayBrowserProblem()
        } else {
          console.error(error)
        }
      })
    }
    this.justHitEscape = false
  }
}

window.getScreenRefreshRate = getScreenRefreshRate

/**
 * Allows to obtain the estimated Hz of the primary monitor in the system.
 */
export async function getScreenRefreshRate (): Promise<number> {
  let requestId = null as number | null
  let callbackTriggered = false
  let resolve

  const DOMHighResTimeStampCollection = [] as number[]

  const triggerAnimation = DOMHighResTimeStamp => {
    DOMHighResTimeStampCollection.unshift(DOMHighResTimeStamp)

    if (DOMHighResTimeStampCollection.length > 10) {
      const t0 = DOMHighResTimeStampCollection.pop()!
      const fps = Math.floor(1000 * 10 / (DOMHighResTimeStamp - t0))

      if (!callbackTriggered || fps > 1000) {
        resolve(Math.min(fps, 1000)/* , DOMHighResTimeStampCollection */)
      }

      callbackTriggered = true
    }

    requestId = window.requestAnimationFrame(triggerAnimation)
  }

  window.requestAnimationFrame(triggerAnimation)

  window.setTimeout(() => {
    window.cancelAnimationFrame(requestId!)
    requestId = null
  }, 500)

  return new Promise(_resolve => {
    resolve = _resolve
  })
}

export const getGamemodeNumber = bot => {
  switch (bot.game.gameMode) {
    case 'survival': return 0
    case 'creative': return 1
    case 'adventure': return 2
    case 'spectator': return 3
    default: return -1
  }
}

export const isMajorVersionGreater = (ver1: string, ver2: string) => {
  const [a1, b1] = ver1.split('.')
  const [a2, b2] = ver2.split('.')
  return +a1 > +a2 || (+a1 === +a2 && +b1 > +b2)
}

let ourLastStatus: string | undefined = ''
export const setLoadingScreenStatus = function (status: string | undefined | null, isError = false, hideDots = false, fromFlyingSquid = false) {
  // null can come from flying squid, should restore our last status
  if (status === null) {
    status = ourLastStatus
  } else if (!fromFlyingSquid) {
    ourLastStatus = status
  }
  fromFlyingSquid = false

  if (status === undefined) {
    appStatusState.status = ''

    hideModal({ reactType: 'app-status' }, {}, { force: true })
    return
  }

  if (!activeModalStack.some(x => x.reactType === 'app-status')) {
    // just showing app status
    resetAppStatusState()
  }
  showModal({ reactType: 'app-status' })
  if (appStatusState.isError) {
    miscUiState.gameLoaded = false
    return
  }
  appStatusState.hideDots = hideDots
  appStatusState.isError = isError
  appStatusState.lastStatus = isError ? appStatusState.status : ''
  appStatusState.status = status
}

// doesn't support snapshots
export const toMajorVersion = version => {
  const [a, b] = (String(version)).split('.')
  return `${a}.${b}`
}

let prevRenderDistance = options.renderDistance
export const setRenderDistance = () => {
  assertDefined(worldView)
  const { renderDistance: singleplayerRenderDistance, multiplayerRenderDistance } = options
  let renderDistance = miscUiState.singleplayer ? singleplayerRenderDistance : multiplayerRenderDistance
  const zeroRenderDistance = miscUiState.singleplayer && renderDistance === 0
  if (zeroRenderDistance) {
    renderDistance = 1 // mineflayer limitation workaround
  }
  bot.setSettings({
    viewDistance: renderDistance
  })
  if (zeroRenderDistance) {
    localServer!.players[0].view = 0
    renderDistance = 0
  }
  worldView.updateViewDistance(renderDistance)
  prevRenderDistance = renderDistance
}
export const reloadChunks = async () => {
  if (!worldView) return
  setRenderDistance()
  await worldView.updatePosition(bot.entity.position, true)
}

export const openGithub = () => {
  window.open(process.env.GITHUB_URL, '_blank')
}

export const resolveTimeout = async (promise, timeout = 10_000) => {
  return new Promise((resolve, reject) => {
    promise.then(resolve, reject)
    setTimeout(() => {
      reject(new Error('timeout'))
    }, timeout)
  })
}

export function assertDefined<T> (x: T | undefined): asserts x is T {
  if (!x) throw new Error('Assertion failed. Something is not available')
}

export const haveDirectoryPicker = () => {
  return !!window.showDirectoryPicker
}

const reportedWarnings = new Set<string>()

export const reportWarningOnce = (id: string, message: string) => {
  if (reportedWarnings.has(id)) return
  reportedWarnings.add(id)
  console.warn(message)
}
