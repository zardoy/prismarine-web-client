import { useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { formatMessage } from '../botUtils'
import { getBuiltinCommandsList, tryHandleBuiltinCommand } from '../builtinCommands'
import { hideCurrentModal, miscUiState } from '../globalState'
import { options } from '../optionsStorage'
import ChatContainer, { Message, fadeMessage } from './ChatContainer'
import { useIsModalActive } from './utils'

export default () => {
  const [messages, setMessages] = useState([] as Message[])
  const isChatActive = useIsModalActive('chat')
  const { messagesLimit, chatOpacity, chatOpacityOpened } = options
  const lastMessageId = useRef(0)
  const usingTouch = useSnapshot(miscUiState).currentTouch

  useEffect(() => {
    bot.addListener('message', (jsonMsg, position) => {
      const parts = formatMessage(jsonMsg)

      setMessages(m => {
        lastMessageId.current++
        const newMessage: Message = {
          parts,
          id: lastMessageId.current,
          faded: false,
        }
        fadeMessage(newMessage, true, () => {
          // eslint-disable-next-line max-nested-callbacks
          setMessages(m => [...m])
        })
        return [...m, newMessage].slice(-messagesLimit)
      })
    })
  }, [])

  return <ChatContainer
    usingTouch={!!usingTouch}
    opacity={(isChatActive ? chatOpacityOpened : chatOpacity) / 100}
    messages={messages}
    opened={isChatActive}
    sendMessage={(message) => {
      const builtinHandled = tryHandleBuiltinCommand(message)
      if (!builtinHandled) {
        bot.chat(message)
      }
    }}
    onClose={() => {
      hideCurrentModal()
    }}
    fetchCompletionItems={async (triggerKind, completeValue) => {
      if ((triggerKind === 'explicit' || options.autoRequestCompletions)) {
        let items = await bot.tabComplete(completeValue, true, true)
        if (typeof items[0] === 'object') {
          // @ts-expect-error
          if (items[0].match) items = items.map(i => i.match)
        }
        if (completeValue === '/') {
          if (!items[0].startsWith('/')) {
            // normalize
            items = items.map(item => `/${item}`)
          }
          if (localServer) {
            items = [...items, ...getBuiltinCommandsList()]
          }
        }
        return items
      }
    }}
  />
}
