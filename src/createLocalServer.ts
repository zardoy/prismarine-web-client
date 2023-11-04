//@ts-check
import { createMCServer } from 'flying-squid/src'
import { LocalServer } from './customServer'

export const startLocalServer = (serverOptions) => {
  const passOptions = { ...serverOptions, Server: LocalServer }
  const server = createMCServer(passOptions) as NonNullable<typeof localServer>
  server.formatMessage = (message) => `[server] ${message}`
  server.options = passOptions
  server.looseProtocolMode = true
  return server
}

// features that flying-squid doesn't support at all
// todo move & generate in flying-squid
export const unsupportedLocalServerFeatures = ['transactionPacketExists', 'teleportUsesOwnPacket', 'dimensionDataIsAvailable']
