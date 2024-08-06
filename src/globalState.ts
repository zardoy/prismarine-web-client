//@ts-check

import { proxy, ref, subscribe } from 'valtio'
import { pointerLock } from './utils'
import type { OptionsGroupType } from './optionsGuiScheme'

// todo: refactor structure with support of hideNext=false

const notHideableModalsWithoutForce = new Set(['app-status'])

type Modal = ({ elem?: HTMLElement & Record<string, any> } & { reactType: string })

type ContextMenuItem = { callback; label }

export const activeModalStack: Modal[] = proxy([])

export const insertActiveModalStack = (name: string, newModalStack = activeModalStacks[name]) => {
  hideModal(undefined, undefined, { restorePrevious: false, force: true })
  activeModalStack.splice(0, activeModalStack.length, ...newModalStack)
  const last = activeModalStack.at(-1)
  if (last) showModalInner(last)
}

export const activeModalStacks: Record<string, Modal[]> = {}

window.activeModalStack = activeModalStack

subscribe(activeModalStack, () => {
  if (activeModalStack.length === 0) {
    if (isGameActive(false)) {
      void pointerLock.requestPointerLock()
    }
  } else {
    document.exitPointerLock?.()
  }
})

export const customDisplayManageKeyword = 'custom'

const defaultModalActions = {
  show (modal: Modal) {
    if (modal.elem) modal.elem.style.display = 'block'
  },
  hide (modal: Modal) {
    if (modal.elem) modal.elem.style.display = 'none'
  }
}

/**
 * @returns true if operation was successful
 */
const showModalInner = (modal: Modal) => {
  const cancel = modal.elem?.show?.()
  if (cancel && cancel !== customDisplayManageKeyword) return false
  if (cancel !== 'custom') defaultModalActions.show(modal)
  return true
}

export const showModal = (elem: /* (HTMLElement & Record<string, any>) |  */{ reactType: string }) => {
  const resolved = elem
  const curModal = activeModalStack.at(-1)
  if (/* elem === curModal?.elem ||  */(elem.reactType && elem.reactType === curModal?.reactType) || !showModalInner(resolved)) return
  if (curModal) defaultModalActions.hide(curModal)
  activeModalStack.push(resolved)
}

/**
 *
 * @returns true if previous modal was restored
 */
export const hideModal = (modal = activeModalStack.at(-1), data: any = undefined, options: { force?: boolean; restorePrevious?: boolean } = {}) => {
  const { force = false, restorePrevious = true } = options
  if (!modal) return
  let cancel
  if (modal.elem) {
    cancel = modal.elem.hide?.(data)
  } else if (modal.reactType) {
    cancel = notHideableModalsWithoutForce.has(modal.reactType) ? !force : undefined
  }
  if (force && cancel !== customDisplayManageKeyword) {
    cancel = undefined
  }

  if (!cancel || cancel === customDisplayManageKeyword) {
    if (cancel !== customDisplayManageKeyword) defaultModalActions.hide(modal)
    activeModalStack.pop()
    const newModal = activeModalStack.at(-1)
    if (newModal && restorePrevious) {
      // would be great to ignore cancel I guess?
      showModalInner(newModal)
    }
    return true
  }
}

export const hideCurrentModal = (_data?, onHide?: () => void) => {
  if (hideModal(undefined, undefined)) {
    onHide?.()
  }
}

export const openOptionsMenu = (group: OptionsGroupType) => {
  showModal({ reactType: `options-${group}` })
}

// ---

export const currentContextMenu = proxy({ items: [] as ContextMenuItem[] | null, x: 0, y: 0 })

export const showContextmenu = (items: ContextMenuItem[], { clientX, clientY }) => {
  Object.assign(currentContextMenu, {
    items,
    x: clientX,
    y: clientY,
  })
}

// ---

export type AppConfig = {
  // defaultHost?: string
  // defaultHostSave?: string
  defaultProxy?: string
  // defaultProxySave?: string
  // defaultVersion?: string
  promoteServers?: Array<{ ip, description, version? }>
  mapsProvider?: string
}

export const miscUiState = proxy({
  currentDisplayQr: null as string | null,
  currentTouch: null as boolean | null,
  hasErrors: false,
  singleplayer: false,
  flyingSquid: false,
  wanOpened: false,
  /** wether game hud is shown (in playing state) */
  gameLoaded: false,
  showUI: true,
  loadedServerIndex: '',
  /** currently trying to load or loaded mc version, after all data is loaded */
  loadedDataVersion: null as string | null,
  appLoaded: false,
  usingGamepadInput: false,
  appConfig: null as AppConfig | null,
  displaySearchInput: false,
})

export const loadedGameState = proxy({
  username: '',
  serverIp: '' as string | null,
  usingServerResourcePack: false,
})

export const isGameActive = (foregroundCheck: boolean) => {
  if (foregroundCheck && activeModalStack.length) return false
  return miscUiState.gameLoaded
}

window.miscUiState = miscUiState

// state that is not possible to get via bot and in-game specific
export const gameAdditionalState = proxy({
  isFlying: false,
  isSprinting: false,
  isSneaking: false,
})

window.gameAdditionalState = gameAdditionalState

// todo restore auto-save on interval for player data! (or implement it in flying squid since there is already auto-save for world)
