import { versionToNumber } from 'prismarine-viewer/viewer/prepare/utils'

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
