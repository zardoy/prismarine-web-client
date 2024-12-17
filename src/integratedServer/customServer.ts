import EventEmitter from 'events'

import { createLocalServerClientImpl } from './customClient'

export const createCustomServerImpl = (...args: Parameters<typeof createLocalServerClientImpl>) => {
  const CustomChannelClient = createLocalServerClientImpl(...args)
  return class LocalServer extends EventEmitter.EventEmitter {
    socketServer = null
    cipher = null
    decipher = null
    clients = {}

    constructor (public version, public customPackets, public hideErrors = false) {
      super()
    }

    listen () {
      this.emit('connection', new CustomChannelClient(true, this.version))
    }

    close () { }
  }
}
