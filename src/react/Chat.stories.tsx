import type { Meta, StoryObj } from '@storybook/react'

import { useEffect, useState } from 'react'
import Chat, { fadeMessage, initialChatOpenValue } from './ChatContainer'
import Button from './Button'

const meta: Meta<typeof Chat> = {
  component: Chat,
  render (args) {
    const [messages, setMessages] = useState(args.messages)
    const [autoSpam, setAutoSpam] = useState(false)
    const [open, setOpen] = useState(args.opened)

    useEffect(() => {
      const abortController = new AbortController()
      addEventListener('keyup', (e) => {
        if (e.code === 'KeyY') {
          initialChatOpenValue.value = '/'
          setOpen(true)
          e.stopImmediatePropagation()
        }
        if (e.code === 'Escape') {
          setOpen(false)
          e.stopImmediatePropagation()
        }
      }, {
        signal: abortController.signal,
      })
      return () => abortController.abort()
    })

    useEffect(() => {
      setMessages(args.messages)
    }, [args.messages])

    useEffect(() => {
      if (!autoSpam) return
      const action = () => {
        setMessages([
          ...messages,
          ...Array.from({ length: 10 }).map((_, i) => ({
            id: (messages.at(-1)?.id ?? 0) + i + 1,
            parts: [
              {
                text: 'tes',
              },
              {
                text: 't',
              }
            ],
          } satisfies typeof args.messages[number]))
        ])
      }
      const interval = setInterval(() => action(), 5000)
      action()
      return () => clearInterval(interval)
    }, [autoSpam])

    const fadeMessages = () => {
      for (const m of messages) {
        fadeMessage(m, false, () => {
          setMessages([...messages])
        })
      }
    }

    return <div>
      <Chat {...args} opened={open} messages={messages} onClose={() => setOpen(false)} fetchCompletionItems={async (triggerType, value) => {
        console.log('fetchCompletionItems')
        await new Promise(resolve => {
          setTimeout(resolve, 700)
        })
        let items = ['test', ...Array.from({ length: 50 }).map((_, i) => `minecraft:hello${i}`)]
        if (value === '/') items = items.map(item => `/${item}`)
        return items
      }} />
      <Button onClick={() => setOpen(s => !s)}>Open: {open ? 'on' : 'off'}</Button>
      <Button onClick={() => fadeMessages()}>Fade</Button>
      <Button onClick={() => setAutoSpam(s => !s)}>Auto Spam: {autoSpam ? 'on' : 'off'}</Button>
      <Button onClick={() => setMessages(args.messages)}>Clear</Button>
    </div>
  },
}

export default meta
type Story = StoryObj<typeof Chat>

export const Primary: Story = {
  args: {
    messages: [{
      parts: [
        {
          'bold': false,
          'italic': false,
          'underlined': false,
          'strikethrough': false,
          'obfuscated': false,
          //@ts-expect-error
          'json': {
            'insertion': 'pviewer672',
            'clickEvent': {
              'action': 'suggest_command',
              'value': '/tell pviewer672 '
            },
            'hoverEvent': {
              'action': 'show_entity',
              'contents': {
                'type': 'minecraft:player',
                'id': 'ecd0eeb1-625e-3fea-b16e-cb449dcfa434',
                'name': {
                  'text': 'pviewer672'
                }
              }
            },
            'text': 'pviewer672'
          },
          'text': 'pviewer672',
          'clickEvent': {
            'action': 'suggest_command',
            'value': '/tell pviewer672 '
          },
          'hoverEvent': {
            'action': 'show_entity',
            'contents': {
              'type': 'minecraft:player',
              'id': 'ecd0eeb1-625e-3fea-b16e-cb449dcfa434',
              'name': {
                'text': 'pviewer672'
              }
            }
          }
        },
        {
          'text': ' joined the game',
          'color': 'yellow',
          'bold': false,
          'italic': false,
          'underlined': false,
          'strikethrough': false,
          'obfuscated': false
        }
      ],
      id: 0,
    }],
    // opened: false,
  }
}
