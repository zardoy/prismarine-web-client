import { useEffect, useState } from 'react'
import { formatMessage } from '../botUtils'
import { getBuiltinCommandsList, tryHandleBuiltinCommand } from '../builtinCommands'
import { hideCurrentModal } from '../globalState'
import { options } from '../optionsStorage'
import ChatContainer, { Message, fadeMessage } from './ChatContainer'
import { useIsModalActive } from './utils'

export default () => {
  const [messages, setMessages] = useState([] as Message[])
  const isChatActive = useIsModalActive('chat')
  const { messagesLimit, chatOpacity, chatOpacityOpened } = options

  useEffect(() => {
    bot.addListener('message', (jsonMsg, position) => {
      const parts = formatMessage(jsonMsg)

      setMessages(m => {
        const lastId = messages.at(-1)?.id ?? 0
        const newMessage: Message = {
          parts,
          id: lastId + 1,
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
    opacity={(isChatActive ? chatOpacityOpened : chatOpacity) / 100}
    messages={messages}
    opened={isChatActive}
    interceptMessage={(message) => {
      const builtinHandled = tryHandleBuiltinCommand(message)
      return !!builtinHandled
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
