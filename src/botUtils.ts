import { versionToNumber } from 'prismarine-viewer/viewer/prepare/utils'
import * as nbt from 'prismarine-nbt'

export const displayClientChat = (text: string) => {
  const message = {
    text
  }
  if (versionToNumber(bot.version) >= versionToNumber('1.19')) {
    bot._client.emit('systemChat', {
      formattedMessage: JSON.stringify(message),
      position: 0,
      sender: 'minecraft:chat'
    })
    return
  }
  bot._client.emit('chat', {
    message: JSON.stringify(message),
    position: 0,
    sender: 'minecraft:chat'
  })
}

export const parseFormattedMessagePacket = (arg) => {
  if (typeof arg === 'object') {
    try {
      return {
        formatted: nbt.simplify(arg),
        plain: ''
      }
    } catch (err) {
      console.warn('Failed to parse formatted message', arg, err)
      return {
        plain: JSON.stringify(arg)
      }
    }
  }
  return {
    plain: String(arg)
  }
}
