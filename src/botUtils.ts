// this should actually be moved to mineflayer / prismarine-viewer

export type MessageFormatPart = {
  text: string
  color?: string
  bold?: boolean
  italic?: boolean
  underlined?: boolean
  strikethrough?: boolean
  obfuscated?: boolean
}

// dont edit these typings manually
type MessageInput = {
  text?: string
  translate?: string
  with?: MessageInput[]
  color?: string
  bold?: boolean
  italic?: boolean
  underlined?: boolean
  strikethrough?: boolean
  obfuscated?: boolean
  extra?: MessageInput[]
}

export const formatMessage = (message: MessageInput) => {
  const msglist: MessageFormatPart[] = []

  const readMsg = (msg) => {
    const styles = {
      color: msg.color,
      bold: !!msg.bold,
      italic: !!msg.italic,
      underlined: !!msg.underlined,
      strikethrough: !!msg.strikethrough,
      obfuscated: !!msg.obfuscated
    }

    if (msg.text) {
      msglist.push({
        ...msg,
        text: msg.text,
        ...styles
      })
    } else if (msg.translate) {
      const tText = window.loadedData.language[msg.translate] ?? msg.translate

      if (msg.with) {
        const splitted = tText.split(/%s|%\d+\$s/g)

        let i = 0
        for (const [j, part] of splitted.entries()) {
          msglist.push({ text: part, ...styles })

          if (j + 1 < splitted.length) {
            if (msg.with[i]) {
              if (typeof msg.with[i] === 'string') {
                readMsg({
                  ...styles,
                  text: msg.with[i]
                })
              } else {
                readMsg({
                  ...styles,
                  ...msg.with[i]
                })
              }
            }
            i++
          }
        }
      } else {
        msglist.push({
          ...msg,
          text: tText,
          ...styles
        })
      }
    }

    if (msg.extra) {
      for (const ex of msg.extra) {
        readMsg({ ...styles, ...ex })
      }
    }
  }

  readMsg(message)

  return msglist
}
