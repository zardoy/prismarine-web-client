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

export const getWsProtocolStream = async (url: string) => {
  if (url.startsWith(':')) url = `ws://localhost${url}`
  if (!url.startsWith('ws')) url = `ws://${url}`
  const ws = new WebSocket(url)
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve()
    ws.onerror = (err) => reject(new Error(`Failed to connect to websocket ${url}`))
    ws.onclose = (ev) => reject(ev.reason)
  })
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
    if (performance.now() - lastMessageTime > 10_000) {
      console.log('no packats received in 10s!')
      clientDuplex.end()
    }
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
