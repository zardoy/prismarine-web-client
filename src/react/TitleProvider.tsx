import { useEffect, useState } from 'react'
import { MessageFormatPart } from '../botUtils'
import Title from './Title'
import type { AnimationTimes } from './Title'
import { BotEvents } from 'mineflayer'


const defaultText: MessageFormatPart[] = [{ text: '' }]

export default () => {
  const [title, setTitle] = useState<MessageFormatPart[]>(defaultText)
  const [subtitle, setSubtitle] = useState<MessageFormatPart[]>(defaultText)
  const [actionBar, setActionBar] = useState<MessageFormatPart[]>(defaultText)
  const [animTimes, setAnimTimes] = useState<AnimationTimes>({ fadeIn: 400, stay: 3800, fadeOut: 800 })
  const [open, setOpen] = useState(false)


  useEffect(() => {
    bot._client.on('set_title_text', (message) => {
      setTitle([JSON.parse(message.text)])
      if (!open) {
        setOpen(true)
      }
    })
    bot._client.on('set_title_subtitle', (message) => {
      setSubtitle([JSON.parse(message.text)])
    })
    bot._client.on('action_bar', (message) => {
      setActionBar([JSON.parse(message.text)])
      if (!open) {
        setOpen(true)
      }
    })
    bot._client.on('set_title_time', (message) => {
      setAnimTimes(JSON.parse(message.text))
    })
    bot._client.on('clear_titles', (message) => {
      const mes = JSON.parse(message.text)
      if (mes.reset) {
        setOpen(false)
        setTitle(defaultText)
        setSubtitle(defaultText)
        setActionBar(defaultText)
        setAnimTimes({ fadeIn: 400, stay: 3800, fadeOut: 800 })
      } else {
        setOpen(false)
      }
    })


    bot.on('set_title_text' as keyof BotEvents, (message) => {
      console.log(message)
      setTitle([JSON.parse(message.text)])
      if (!open) {
        setOpen(true)
      }
    })
    bot.on('set_title_subtitle' as keyof BotEvents, (message) => {
      setSubtitle([JSON.parse(message.text)])
    })
    bot.on('action_bar' as keyof BotEvents, (message) => {
      setActionBar([JSON.parse(message.text)])
      if (!open) {
        setOpen(true)
      }
    })
    bot.on('set_title_time' as keyof BotEvents, (message) => {
      setAnimTimes(JSON.parse(message.text))
    })
    bot.on('clear_titles' as keyof BotEvents, (message) => {
      const mes = JSON.parse(message.text)
      if (mes.reset) {
        setOpen(false)
        setTitle(defaultText)
        setSubtitle(defaultText)
        setActionBar(defaultText)
        setAnimTimes({ fadeIn: 400, stay: 3800, fadeOut: 800 })
      } else {
        setOpen(false)
      }

    })
  }, [])

  useEffect(() => {
    let timeoutID: ReturnType<typeof setTimeout> | undefined = undefined
    if (open) {
      timeoutID = setTimeout(() => {
        setOpen(false)
      }, animTimes.stay)
    } 

    return () => {
      clearTimeout(timeoutID)
    }
  }, [open])

  return <Title
    title={title}
    subtitle={subtitle}
    actionBar={actionBar}
    transitionTimes={animTimes}
    open={open}
  />
}
