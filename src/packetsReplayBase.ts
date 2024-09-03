export class PacketsLogger {
  lastPacketTime = -1
  contents = ''
  logOnly = [] as string[]
  skip = [] as string[]

  logStr (str: string) {
    this.contents += `${str}\n`
  }

  log (isFromServer: boolean, packet: { name; state }, data: any) {
    if (this.logOnly.length > 0 && !this.logOnly.includes(packet.name)) {
      return
    }
    if (this.skip.length > 0 && this.skip.includes(packet.name)) {
      return
    }
    if (this.lastPacketTime === -1) {
      this.lastPacketTime = Date.now()
    }

    const diff = `+${Date.now() - this.lastPacketTime}`
    // serialize bigint
    const str = `${isFromServer ? 'S' : 'C'} ${packet.state}:${packet.name} ${diff} ${JSON.stringify(data, (key, value) => {
      if (typeof value === 'bigint') return value.toString()
      return value
    })}`
    this.logStr(str)
    this.lastPacketTime = Date.now()
  }
}

export type ParsedReplayPacket = {
  name: string
  params: any
  state: string
  diff: number
  isFromServer: boolean
}
export function parseReplayContents (contents: string) {
  const lines = contents.split('\n')

  const packets = [] as ParsedReplayPacket[]
  for (let line of lines) {
    line = line.trim()
    if (!line || line.startsWith('#')) continue
    const [side, nameState, diff, ...data] = line.split(' ')
    const parsed = JSON.parse(data.join(' '))
    const [state, name] = nameState.split(':')
    packets.push({
      name,
      state,
      params: parsed,
      isFromServer: side.toUpperCase() === 'S',
      diff: Number.parseInt(diff.slice(1), 10),
    })
  }

  return packets
}
