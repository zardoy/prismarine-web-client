import { proxy } from 'valtio'
import { PacketsLogger } from './packetsReplayBase'
import { options } from './optionsStorage'

export const packetsReplaceSessionState = proxy({
  active: false,
})

const replayLogger = new PacketsLogger()

const isBufferData = (data: any): boolean => {
  if (Buffer.isBuffer(data) || data instanceof Uint8Array) return true
  if (typeof data === 'object' && data !== null) {
    return Object.values(data).some(value => isBufferData(value))
  }
  return false
}

const processPacketData = (data: any): any => {
  if (options.packetsLoggerPreset === 'no-buffers') {
    if (Buffer.isBuffer(data)) {
      return '[buffer]'
    }
    if (typeof data === 'object' && data !== null) {
      const processed = {}
      for (const [key, value] of Object.entries(data)) {
        processed[key] = isBufferData(value) ? '[buffer]' : value
      }
      return processed
    }
  }
  return data
}

export default () => {
  customEvents.on('mineflayerBotCreated', () => {
    replayLogger.contents = ''
    const handleServerPacket = (data, { name, state = bot._client.state }) => {
      if (!packetsReplaceSessionState.active) {
        return
      }
      replayLogger.log(true, { name, state }, processPacketData(data))
    }
    bot._client.on('packet', handleServerPacket)
    bot._client.on('packet_name' as any, (name, data) => {
      handleServerPacket(data, { name })
    })

    bot._client.on('writePacket' as any, (name, data) => {
      if (!packetsReplaceSessionState.active) {
        return
      }
      replayLogger.log(false, { name, state: bot._client.state }, processPacketData(data))
    })
  })
}

export const downloadPacketsReplay = async () => {
  const a = document.createElement('a')
  a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(replayLogger.contents)}`
  a.download = `packets-replay-${new Date().toISOString()}.txt`
  a.click()
}
