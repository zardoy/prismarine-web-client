import { useWorkerProxy } from 'prismarine-viewer/examples/workerProxy'
import { options } from '../optionsStorage'
import { setLoadingScreenStatus } from '../utils'
import { chatInputValueGlobal } from '../react/Chat'
import { showModal } from '../globalState'
import { showNotification } from '../react/NotificationProvider'
import { fsState } from '../loadSave'
import type { workerProxyType, BackEvents, CustomAppSettings } from './worker'
import { createLocalServerClientImpl } from './customClient'
import { getMcDataForWorker } from './workerMcData.mjs'

// eslint-disable-next-line import/no-mutable-exports
export let serverChannel: typeof workerProxyType['__workerProxy'] | undefined
let worker: Worker | undefined
let lastOptions: any
let lastCustomSettings: CustomAppSettings

const addEventListener = <T extends keyof BackEvents> (type: T, listener: (data: BackEvents[T]) => void) => {
  if (!worker) throw new Error('Worker not started yet')
  worker.addEventListener('message', e => {
    if (e.data.type === type) {
      listener(e.data.data)
    }
  })
}

export const getLocalServerOptions = () => {
  return lastOptions
}

const restorePatchedDataDeep = (data) => {
  // add _isBuffer to Uint8Array
  if (data instanceof Uint8Array) {
    //@ts-expect-error
    data._isBuffer = true
    return data
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      restorePatchedDataDeep(item)
    }
    return data
  }
  if (typeof data === 'object' && data !== null) {
    // eslint-disable-next-line guard-for-in
    for (const key in data) {
      restorePatchedDataDeep(data[key])
    }
  }
}

export const updateLocalServerSettings = (settings: Partial<CustomAppSettings>) => {
  lastCustomSettings = { ...lastCustomSettings, ...settings }
  serverChannel?.updateSettings(settings)
}

export const startLocalServerMain = async (serverOptions: { version: any, worldFolder? }) => {
  worker = new Worker('./integratedServer.js')
  serverChannel = useWorkerProxy<typeof workerProxyType>(worker, true)
  const readyPromise = new Promise<void>(resolve => {
    addEventListener('ready', () => {
      resolve()
    })
  })

  fsState.inMemorySavePath = serverOptions.worldFolder ?? ''
  void serverChannel.start({
    options: serverOptions,
    mcData: await getMcDataForWorker(serverOptions.version),
    settings: lastCustomSettings,
    fsState: structuredClone(fsState)
  })

  await readyPromise

  const CustomClient = createLocalServerClientImpl((data) => {
    if (!serverChannel) console.warn(`Server is destroyed (trying to send ${data.name} packet)`)
    serverChannel?.packet(data)
  }, (processData) => {
    addEventListener('packet', (data) => {
      restorePatchedDataDeep(data)
      processData(data)
    })
  }, options.excludeCommunicationDebugEvents)
  setupEvents()
  return {
    CustomClient
  }
}

const setupEvents = () => {
  addEventListener('loadingStatus', (newStatus) => {
    setLoadingScreenStatus(newStatus, false, false, true)
  })
  addEventListener('notification', ({ message, title, isError, suggestCommand }) => {
    const clickAction = () => {
      if (suggestCommand) {
        chatInputValueGlobal.value = suggestCommand
        showModal({ reactType: 'chat' })
      }
    }

    showNotification(title, message, isError ?? false, 'label-alt', clickAction)
  })
}

export const destroyLocalServerMain = async (throwErr = true) => {
  if (!worker) {
    if (throwErr) {
      throw new Error('Worker not started yet')
    }
    return
  }

  void serverChannel!.quit()
  await new Promise<void>(resolve => {
    addEventListener('quit', () => {
      resolve()
    })
  })
  worker.terminate()
  worker = undefined
  lastOptions = undefined
}
