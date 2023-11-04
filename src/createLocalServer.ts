//@ts-check
import { createMCServer } from 'flying-squid'
import { LocalServer } from './customServer'

export const startLocalServer = (serverOptions) => {
  const passOptions = { ...serverOptions, Server: LocalServer }
  const server = createMCServer(passOptions)
  server.formatMessage = (message) => `[server] ${message}`
  server.options = passOptions
  server.looseProtocolMode = true
  return server
}

declare global {
  interface Server {
    options: Options
  }
}

// features that flying-squid doesn't support at all
// todo move & generate in flying-squid
export const unsupportedLocalServerFeatures = ['transactionPacketExists', 'teleportUsesOwnPacket', 'dimensionDataIsAvailable']
