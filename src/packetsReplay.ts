import { proxy } from 'valtio'
import { PacketsLogger } from './packetsReplayBase'

export const packetsReplaceSessionState = proxy({
  active: false,
})

const replayLogger = new PacketsLogger()
export default () => {
  customEvents.on('mineflayerBotCreated', () => {
    replayLogger.contents = ''
    bot._client.on('packet', (data, { name, state }) => {
      if (!packetsReplaceSessionState.active) {
        return
      }
      replayLogger.log(true, { name, state }, data)
    })
    bot._client.on('writePacket' as any, (name, data) => {
      if (!packetsReplaceSessionState.active) {
        return
      }
      replayLogger.log(false, { name, state: bot._client.state }, data)
    })
  })
}

export const downloadPacketsReplay = async () => {
  const a = document.createElement('a')
  a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(replayLogger.contents)}`
  a.download = `packets-replay-${new Date().toISOString()}.txt`
  a.click()
}
