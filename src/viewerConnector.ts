import { EventEmitter } from 'events'
import { Duplex } from 'stream'
import states from 'minecraft-protocol/src/states'
import { createClient } from 'minecraft-protocol'

class CustomDuplex extends Duplex {
  constructor (options, public writeAction) {
    super(options)
  }

  override _read () {}

  override _write (chunk, encoding, callback) {
    this.writeAction(chunk)
    callback()
  }
}

export const getViewerVersionData = async (url: string) => {
  const ws = await openWebsocket(url)
  ws.send('version')
  return new Promise<{
    version: string
    time: number,
    clientIgnoredPackets?: string[]
  }>((resolve, reject) => {
    ws.addEventListener('message', async (message) => {
      const { data } = message
      const parsed = JSON.parse(data.toString())
      resolve(parsed)
      ws.close()
      // todo
      customEvents.on('mineflayerBotCreated', () => {
        const client = bot._client as any
        const oldWrite = client.write.bind(client)
        client.write = (...args) => {
          const [name] = args
          if (parsed?.clientIgnoredPackets?.includes(name)) {
            return
          }
          oldWrite(...args)
        }
      })
    })
  })
}

const openWebsocket = async (url: string) => {
  if (url.startsWith(':')) url = `ws://localhost${url}`
  if (!url.startsWith('ws')) url = `ws://${url}`
  const ws = new WebSocket(url)
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve()
    ws.onerror = (err) => reject(new Error(`[websocket] Failed to connect to ${url}`))
    ws.onclose = (ev) => reject(ev.reason)
  })
  return ws
}

export const getWsProtocolStream = async (url: string) => {
  const ws = await openWebsocket(url)
  const clientDuplex = new CustomDuplex(undefined, data => {
    // console.log('send', Buffer.from(data).toString('hex'))
    ws.send(data)
  })
  // todo use keep alive instead?
  let lastMessageTime = performance.now()
  ws.addEventListener('message', async (message) => {
    let { data } = message
    if (data instanceof Blob) {
      data = await data.arrayBuffer()
    }
    clientDuplex.push(Buffer.from(data))
    lastMessageTime = performance.now()
  })
  setInterval(() => {
    // if (clientDuplex.destroyed) return
    // if (performance.now() - lastMessageTime > 10_000) {
    //   console.log('no packats received in 10s!')
    //   clientDuplex.end()
    // }
  }, 5000)

  ws.addEventListener('close', () => {
    console.log('ws closed')
    clientDuplex.end()
    // bot.emit('end', 'Disconnected.')
  })

  ws.addEventListener('error', err => {
    console.log('ws error', err)
  })

  return clientDuplex
}
