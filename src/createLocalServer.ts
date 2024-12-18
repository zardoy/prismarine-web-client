import { createMCServer } from 'flying-squid/dist'

export const startLocalServer = (serverOptions, LocalServer) => {
  const passOptions = { ...serverOptions, Server: LocalServer }
  const server = createMCServer(passOptions)
  server.formatMessage = (message) => `[server] ${message}`
  //@ts-expect-error
  server.options = passOptions
  //@ts-expect-error todo remove
  server.looseProtocolMode = true
  return server
}

// features that flying-squid doesn't support at all
// todo move & generate in flying-squid
export const unsupportedLocalServerFeatures = ['transactionPacketExists', 'teleportUsesOwnPacket']
