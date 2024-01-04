import { useEffect, useMemo, useRef, useState } from 'react'
import { isCypress } from '../standaloneUtils'
import { MessageFormatPart } from '../botUtils'
import { MessagePart } from './MessageFormatted'
import './ChatContainer.css'
import { useUsingTouch } from '@dimaka/interface'

export type Message = {
  parts: MessageFormatPart[],
  id: number
  fading?: boolean
  faded?: boolean
}

const MessageLine = ({ message }) => {
  const classes = {
    'chat-message-fadeout': message.fading,
    'chat-message-fade': message.fading,
    'chat-message-faded': message.faded,
    'chat-message': true
  }

  return <li className={Object.entries(classes).filter(([, val]) => val).map(([name]) => name).join(' ')}>
    {message.parts.map((msg, i) => <MessagePart key={i} part={msg} />)}
  </li>
}

type Props = {
  messages: Message[]
  touch?: boolean
  opacity?: number
  opened?: boolean
  onClose?: () => void
  interceptMessage?: (message: string) => boolean
  fetchCompletionItems?: (triggerKind: 'implicit' | 'explicit', completeValue: string, fullValue: string, abortController?: AbortController) => Promise<string[] | void>
  // width?: number
}

export const initialChatOpenValue = {
  value: ''
}

export const fadeMessage = (message: Message, initialTimeout: boolean, requestUpdate: () => void) => {
  setTimeout(() => {
    message.fading = true
    requestUpdate()
    setTimeout(() => {
      message.faded = true
      requestUpdate()
    }, 3000)
  }, initialTimeout ? 5000 : 0)
}

export default ({ messages, touch, opacity, fetchCompletionItems, opened, interceptMessage, onClose }: Props) => {
  const usingTouch = useUsingTouch()

  const [sendHistory, _setSendHistory] = useState(JSON.parse(window.sessionStorage.chatHistory || '[]'))

  const [completePadText, setCompletePadText] = useState('')
  const completeRequestValue = useRef('')
  const [completionItemsSource, setCompletionItemsSource] = useState([] as string[])
  const [completionItems, setCompletionItems] = useState([] as string[])

  const chatInput = useRef<HTMLInputElement>(null!)
  const chatMessages = useRef<HTMLDivElement>(null!)
  const openedChatWasAtBottom = useRef(false)
  const chatHistoryPos = useRef(0)
  const inputCurrentlyEnteredValue = useRef('')

  const setSendHistory = (newHistory: string[]) => {
    _setSendHistory(newHistory)
    window.sessionStorage.chatHistory = JSON.stringify(newHistory)
  }

  const acceptComplete = (item: string) => {
    const base = completeRequestValue.current === '/' ? '' : getCompleteValue()
    updateInputValue(base + item)
    // todo would be cool but disabled because some comands don't need args (like ping)
    // // trigger next tab complete
    // this.chatInput.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    chatInput.current.focus()
  }

  const updateInputValue = (newValue: string) => {
    chatInput.current.value = newValue
    onMainInputChange()
    setTimeout(() => {
      chatInput.current.setSelectionRange(newValue.length, newValue.length)
    }, 0)
  }

  useEffect(() => {
    // todo focus input on any keypress except tab

    chatInput.current.addEventListener('keypress', e => {
      if (e.code === 'Enter') {
        const message = chatInput.current.value
        if (message) {
          setSendHistory([...sendHistory, message])
          const handled = interceptMessage?.(message)
          if (!handled) {
            bot.chat(message)
          }
        }
        onClose?.()
      }
    })
  }, [])

  const resetCompletionItems = () => {
    setCompletionItemsSource([])
    setCompletionItems([])
  }

  useEffect(() => {
    if (opened) {
      chatHistoryPos.current = messages.length
      updateInputValue(initialChatOpenValue.value)
      initialChatOpenValue.value = ''
      if (!usingTouch) {
        chatInput.current.focus()
      }
    }
    if (!opened) {
      chatMessages.current.scrollTop = chatMessages.current.scrollHeight
    }
  }, [opened])

  useMemo(() => {
    if (opened) {
      resetCompletionItems()
    }
  }, [opened])

  useEffect(() => {
    if (!opened || (opened && openedChatWasAtBottom.current)) {
      openedChatWasAtBottom.current = false
      // stay at bottom on messages changes
      chatMessages.current.scrollTop = chatMessages.current.scrollHeight
    }
  }, [messages])

  useMemo(() => {
    if ((opened && chatMessages.current)) {
      const wasAtBottom = chatMessages.current.scrollTop === chatMessages.current.scrollHeight - chatMessages.current.clientHeight
      openedChatWasAtBottom.current = wasAtBottom
      // console.log(wasAtBottom, chatMessages.current.scrollTop, chatMessages.current.scrollHeight - chatMessages.current.clientHeight)
    }
  }, [messages])

  const auxInputFocus = (fireKey: string) => {
    chatInput.current.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { code: fireKey }))
  }

  const getDefaultCompleteValue = () => {
    const raw = chatInput.current.value
    return raw.slice(0, chatInput.current.selectionEnd ?? raw.length)
  }
  const getCompleteValue = (value = getDefaultCompleteValue()) => {
    const valueParts = value.split(' ')
    const lastLength = valueParts.at(-1)!.length
    const completeValue = lastLength ? value.slice(0, -lastLength) : value
    if (valueParts.length === 1 && value.startsWith('/')) return '/'
    return completeValue
  }

  const fetchCompletions = async (implicit: boolean, inputValue = chatInput.current.value) => {
    const completeValue = getCompleteValue(inputValue)
    completeRequestValue.current = completeValue
    resetCompletionItems()
    const newItems = await fetchCompletionItems?.(implicit ? 'implicit' : 'explicit', completeValue, inputValue) ?? []
    if (completeValue !== completeRequestValue.current) return
    setCompletionItemsSource(newItems)
    updateFilteredCompleteItems(newItems)
  }

  const updateFilteredCompleteItems = (sourceItems: string[]) => {
    const newCompleteItems = sourceItems.filter(i => {
      // this regex is imporatnt is it controls the word matching
      const compareableParts = i.split(/[_:]/)
      const lastWord = chatInput.current.value.slice(0, chatInput.current.selectionEnd ?? chatInput.current.value.length).split(' ').at(-1)!
      return compareableParts.some(compareablePart => compareablePart.startsWith(lastWord))
    })
    setCompletionItems(newCompleteItems)
  }

  const onMainInputChange = () => {
    const completeValue = getCompleteValue()
    setCompletePadText(completeValue === '/' ? '' : completeValue)
    if (completeRequestValue.current === completeValue) {
      updateFilteredCompleteItems(completionItemsSource)
      return
    }
    if (completeValue === '/') {
      void fetchCompletions(true)
    }
  }

  return (
    <>
      <div className={`chat-wrapper chat-messages-wrapper ${touch ? 'display-mobile' : ''}`} hidden={isCypress()}>
        <div ref={chatMessages} className={`chat ${opened ? 'opened' : ''}`} id="chat-messages" style={{ opacity }}>
          {messages.map((m) => (
            <MessageLine key={m.id} message={m} />
          ))}
        </div>
      </div>

      <div className={`chat-wrapper chat-input-wrapper ${touch ? 'input-mobile' : ''}`} hidden={!opened}>
        <div className="chat-input">
          {completionItems?.length ? (
            <div className="chat-completions">
              <div className="chat-completions-pad-text">{completePadText}</div>
              <div className="chat-completions-items">
                {completionItems.map((item) => (
                  <div key={item} onClick={() => acceptComplete(item)}>{item}</div>
                ))}
              </div>
            </div>
          ) : null}
          <input
            value=''
            type="text"
            className="chat-mobile-hidden"
            id="chatinput-next-command"
            spellCheck={false}
            autoComplete="off"
            onFocus={() => auxInputFocus('ArrowUp')}
            onChange={() => { }}
          />
          <input
            defaultValue=''
            ref={chatInput}
            type="text"
            className="chat-input"
            id="chatinput"
            spellCheck={false}
            autoComplete="off"
            aria-autocomplete="both"
            onChange={onMainInputChange}
            onKeyDown={(e) => {
              if (e.code === 'ArrowUp') {
                if (chatHistoryPos.current === 0) return
                if (chatHistoryPos.current === sendHistory.length) { // started navigating history
                  inputCurrentlyEnteredValue.current = e.currentTarget.value
                }
                chatHistoryPos.current--
                updateInputValue(sendHistory[chatHistoryPos.current] || '')
              } else if (e.code === 'ArrowDown') {
                if (chatHistoryPos.current === sendHistory.length) return
                chatHistoryPos.current++
                updateInputValue(sendHistory[chatHistoryPos.current] || inputCurrentlyEnteredValue || '')
              }
              if (e.code === 'Tab') {
                if (completionItemsSource.length) {
                  if (completionItems.length) {
                    acceptComplete(completionItems[0])
                  }
                } else {
                  void fetchCompletions(false)
                }
                e.preventDefault()
              }
              if (e.code === 'Space') {
                resetCompletionItems()
                if (chatInput.current.value.startsWith('/')) {
                  // alternative we could just simply use keyup, but only with keydown we can display suggestions popup as soon as possible
                  void fetchCompletions(true, getCompleteValue(getDefaultCompleteValue() + ' '))
                }
              }
            }}
          />
          <input
            value=''
            type="text"
            className="chat-mobile-hidden"
            id="chatinput-prev-command"
            spellCheck={false}
            autoComplete="off"
            onFocus={() => auxInputFocus('ArrowDown')}
            onChange={() => { }}
          />
        </div>
      </div>
    </>
  )
}
