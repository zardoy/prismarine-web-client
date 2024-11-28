import { proxy, useSnapshot } from 'valtio'
import { useEffect, useRef, useState } from 'react'
import { activeModalStack, activeModalStacks, hideModal, insertActiveModalStack, miscUiState, showModal } from '../globalState'
import { resetLocalStorageWorld } from '../browserfs'
import { fsState } from '../loadSave'
import { guessProblem } from '../errorLoadingScreenHelpers'
import { ConnectOptions } from '../connect'
import { downloadPacketsReplay, packetsReplaceSessionState } from '../packetsReplay'
import { getProxyDetails } from '../microsoftAuthflow'
import AppStatus from './AppStatus'
import DiveTransition from './DiveTransition'
import { useDidUpdateEffect } from './utils'
import { useIsModalActive } from './utilsApp'
import Button from './Button'
import { AuthenticatedAccount, updateAuthenticatedAccountData, updateLoadedServerData } from './ServersListProvider'
import { showOptionsModal } from './SelectOption'
import LoadingChunks from './LoadingChunks'
import MessageFormatted from './MessageFormatted'
import MessageFormattedString from './MessageFormattedString'

const initialState = {
  status: '',
  lastStatus: '',
  maybeRecoverable: true,
  descriptionHint: '',
  isError: false,
  hideDots: false,
  loadingChunksData: null as null | Record<string, string>,
  loadingChunksDataPlayerChunk: null as null | { x: number, z: number },
  isDisplaying: false,
  minecraftJsonMessage: null as null | Record<string, any>
}
export const appStatusState = proxy(initialState)
export const resetAppStatusState = () => {
  Object.assign(appStatusState, initialState)
}

export const lastConnectOptions = {
  value: null as ConnectOptions | null
}

export default () => {
  const { isError, lastStatus, maybeRecoverable, status, hideDots, descriptionHint, loadingChunksData, loadingChunksDataPlayerChunk, minecraftJsonMessage } = useSnapshot(appStatusState)
  const { active: replayActive } = useSnapshot(packetsReplaceSessionState)

  const isOpen = useIsModalActive('app-status')

  useDidUpdateEffect(() => {
    // todo play effect only when world successfully loaded
    if (!isOpen) {
      const divingElem: HTMLElement = document.querySelector('#viewer-canvas')!
      divingElem.style.animationName = 'dive-animation'
      divingElem.parentElement!.style.perspective = '1200px'
      divingElem.onanimationend = () => {
        divingElem.parentElement!.style.perspective = ''
        divingElem.onanimationend = null
      }
    }
  }, [isOpen])

  const reconnect = () => {
    resetAppStatusState()
    window.dispatchEvent(new window.CustomEvent('connect', {
      detail: lastConnectOptions.value
    }))
  }

  useEffect(() => {
    const controller = new AbortController()
    window.addEventListener('keyup', (e) => {
      if (activeModalStack.at(-1)?.reactType !== 'app-status') return
      if (e.code !== 'KeyR' || !lastConnectOptions.value) return
      reconnect()
    }, {
      signal: controller.signal
    })
    return () => controller.abort()
  }, [])

  const displayAuthButton = status.includes('This server appears to be an online server and you are providing no authentication.')
  const displayVpnButton = status.includes('VPN') || status.includes('Proxy')
  const authReconnectAction = async () => {
    let accounts = [] as AuthenticatedAccount[]
    updateAuthenticatedAccountData(oldAccounts => {
      accounts = oldAccounts
      return oldAccounts
    })

    const account = await showOptionsModal('Choose account to connect with', [...accounts.map(account => account.username), 'Use other account'])
    if (!account) return
    lastConnectOptions.value!.authenticatedAccount = accounts.find(acc => acc.username === account) || true
    reconnect()
  }

  return <DiveTransition open={isOpen}>
    <AppStatus
      status={status}
      isError={isError || appStatusState.status === ''} // display back button if status is empty as probably our app is errored
      hideDots={hideDots}
      lastStatus={lastStatus}
      description={<>{
        displayAuthButton ? '' : (isError ? guessProblem(status) : '') || descriptionHint
      }{
        minecraftJsonMessage && <MessageFormattedString message={minecraftJsonMessage} />
      }</>}
      backAction={maybeRecoverable ? () => {
        resetAppStatusState()
        miscUiState.gameLoaded = false
        miscUiState.loadedDataVersion = null
        window.loadedData = undefined
        if (activeModalStacks['main-menu']) {
          insertActiveModalStack('main-menu')
          if (activeModalStack.at(-1)?.reactType === 'app-status') {
            hideModal(undefined, undefined, { force: true }) // workaround: hide loader that was shown on world loading
          }
        } else {
          hideModal(undefined, undefined, { force: true })
        }
      } : undefined}
      actionsSlot={
        <>
          {displayAuthButton && <Button label='Authenticate' onClick={authReconnectAction} />}
          {displayVpnButton && <PossiblyVpnBypassProxyButton reconnect={reconnect} />}
          {replayActive && <Button label='Download Packets Replay' onClick={downloadPacketsReplay} />}
        </>
      }
    >
      {loadingChunksData && <LoadingChunks regionFiles={Object.keys(loadingChunksData)} stateMap={loadingChunksData} playerChunk={loadingChunksDataPlayerChunk} />}
      {isOpen && <DisplayingIndicator />}
    </AppStatus>
  </DiveTransition>
}

const DisplayingIndicator = () => {
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        appStatusState.isDisplaying = true
      })
    })
  }, [])

  return <div />
}

const PossiblyVpnBypassProxyButton = ({ reconnect }: { reconnect: () => void }) => {
  const [vpnBypassProxy, setVpnBypassProxy] = useState('')

  const useVpnBypassProxyAction = () => {
    updateLoadedServerData((data) => {
      data.proxyOverride = vpnBypassProxy
      return data
    }, lastConnectOptions.value?.serverIndex)
    lastConnectOptions.value!.proxy = vpnBypassProxy
    reconnect()
  }

  useEffect(() => {
    const proxy = lastConnectOptions.value?.proxy
    if (!proxy) return
    getProxyDetails(proxy)
      .then(async (r) => r.json())
      .then(({ capabilities }) => {
        const { vpnBypassProxy } = capabilities
        if (!vpnBypassProxy) return
        setVpnBypassProxy(vpnBypassProxy)
      })
      .catch(() => { })
  }, [])

  if (!vpnBypassProxy) return
  return <Button label='Use VPN bypass proxy' onClick={useVpnBypassProxyAction} />
}
