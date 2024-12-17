import { createWorkerProxy } from 'prismarine-viewer/examples/workerProxy'
import { startLocalServer } from '../createLocalServer'
import defaultServerOptions from '../defaultLocalServerOptions'
import { createCustomServerImpl } from './customServer'
import { localFsState } from './browserfsShared'
import { mountFsBackend, onWorldOpened } from './browserfsServer'

let server: import('flying-squid/dist/index').FullServer & { options }

export interface CustomAppSettings {
  autoSave: boolean
  stopLoad: boolean
}

export interface BackEvents {
  ready: {}
  quit: {}
  packet: any
  otherPlayerPacket: {
    player: string
    packet: any
  }
  loadingStatus: string
  notification: {
    title: string,
    message: string,
    suggestCommand?: string,
    isError?: boolean,
  }
}

const postMessage = <T extends keyof BackEvents>(type: T, data?: BackEvents[T], ...args) => {
  try {
    globalThis.postMessage({ type, data }, ...args)
  } catch (err) {
    // eslint-disable-next-line no-debugger
    debugger
  }
}

let processDataGlobal
let globalSettings: Partial<CustomAppSettings> = {}

const collectTransferables = (data, collected) => {
  if (data instanceof Uint8Array) {
    collected.push(data.buffer)
    return
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      collectTransferables(item, collected)
    }
    return
  }
  if (typeof data === 'object' && data !== null) {
    // eslint-disable-next-line guard-for-in
    for (const key in data) {
      collectTransferables(data[key], collected)
    }
  }
}

const startServer = async (serverOptions) => {
  const LocalServer = createCustomServerImpl((data) => {
    const transferrables = []
    collectTransferables(data, transferrables)
    postMessage('packet', data, transferrables)
  }, (processData) => {
    processDataGlobal = processData
  })
  server = globalThis.server = startLocalServer(serverOptions, LocalServer) as any

  // todo need just to call quit if started
  // loadingScreen.maybeRecoverable = false
  // init world, todo: do it for any async plugins
  if (!server.pluginsReady) {
    await new Promise<void>(resolve => {
      server.once('pluginsReady', resolve)
    })
  }
  let wasNew = true
  server.on('newPlayer', (player) => {
    if (!wasNew) return
    wasNew = false
    // it's you!
    player.on('loadingStatus', (newStatus) => {
      postMessage('loadingStatus', newStatus)
    })
  })
  setupServer()
  postMessage('ready')
}

const setupServer = () => {
  server!.on('warpsLoaded', () => {
    postMessage('notification', {
      title: `${server.warps.length} Warps loaded`,
      suggestCommand: '/warp ',
      message: 'Use /warp <name> to teleport to a warp point.',
    })
  })
  server!.on('newPlayer', (player) => {
    player.stopChunkUpdates = globalSettings.stopLoad ?? false
  })
  updateSettings(true)
}

const updateSettings = (initial = true) => {
  if (!server) return
  for (const player of server.players) {
    player.stopChunkUpdates = globalSettings.stopLoad ?? false
  }
}

export const workerProxyType = createWorkerProxy({
  async start ({ options, mcData, settings, fsState }: { options: any, mcData: any, settings: CustomAppSettings, fsState: typeof localFsState }) {
    globalSettings = settings
    //@ts-expect-error
    globalThis.mcData = mcData
    Object.assign(localFsState, fsState)
    await mountFsBackend()
    // onWorldOpened(username, root)

    void startServer(options)
  },
  packet (data) {
    if (!processDataGlobal) throw new Error('processDataGlobal is not set yet')
    processDataGlobal(data)
  },
  updateSettings (settings) {
    globalSettings = settings
    updateSettings(false)
  },
  async quit () {
    try {
      await server?.quit()
    } catch (err) {
      console.error(err)
    }
    postMessage('quit')
  }
})

setInterval(() => {
  if (server && globalSettings.autoSave) {
    // TODO!
    // void saveServer(true)
  }
}, 2000)
