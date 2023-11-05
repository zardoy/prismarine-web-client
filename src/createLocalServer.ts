import { LocalServer } from './customServer'

const { createMCServer } = require('flying-squid/src')

export const startLocalServer = (serverOptions) => {
  const passOptions = { ...serverOptions, Server: LocalServer }
  const server: NonNullable<typeof localServer> = createMCServer(passOptions)
  server.formatMessage = (message) => `[server] ${message}`
  server.options = passOptions
  server.looseProtocolMode = true
  return server
}

// features that flying-squid doesn't support at all
// todo move & generate in flying-squid
export const unsupportedLocalServerFeatures = ['transactionPacketExists', 'teleportUsesOwnPacket', 'dimensionDataIsAvailable']
