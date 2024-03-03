import { useEffect, useState } from 'react'
import { BotEvents } from 'mineflayer'
import type { ClientOnMap } from '../generatedServerPackets'
import Title from './Title'
import type { AnimationTimes } from './Title'


const defaultText: Record<string, any> = { 'text': '' }

export default () => {
  const [title, setTitle] = useState<string | Record<string, any>>(defaultText)
  const [subtitle, setSubtitle] = useState<string | Record<string, any>>(defaultText)
  const [actionBar, setActionBar] = useState<string | Record<string, any>>(defaultText)
  const [animTimes, setAnimTimes] = useState<AnimationTimes>({ fadeIn: 400, stay: 3800, fadeOut: 800 })
  const [open, setOpen] = useState(false)


  useEffect(() => {
    bot._client.on('set_title_text', (packet) => {
      setTitle(JSON.parse(packet.text))
      if (!open) {
        setOpen(true)
      }
    })
    bot._client.on('set_title_subtitle', (packet) => {
      setSubtitle(JSON.parse(packet.text))
    })
    bot._client.on('action_bar', (packet) => {
      setActionBar(JSON.parse(packet.text))
      if (!open) {
        setOpen(true)
      }
    })
    bot._client.on('set_title_time', (packet) => {
      setAnimTimes(packet)
    })
    bot._client.on('clear_titles', (mes) => {
      setOpen(false)
      if (mes.reset) {
        setTitle(defaultText)
        setSubtitle(defaultText)
        setActionBar(defaultText)
        setAnimTimes({ fadeIn: 400, stay: 3800, fadeOut: 800 })
      }
    })


    bot.on('set_title_text' as keyof BotEvents, (packet) => {
      console.log(packet.text)
      setTitle(JSON.parse(packet.text))
      if (!open) {
        setOpen(true)
      }
    })
    bot.on('set_title_subtitle' as keyof BotEvents, (packet) => {
      setSubtitle(JSON.parse(packet.text))
    })
    bot.on('action_bar' as keyof BotEvents, (packet) => {
      setActionBar(JSON.parse(packet.text))
      if (!open) {
        setOpen(true)
      }
    })
    bot.on('set_title_time' as keyof BotEvents, (packet) => {
      console.log(packet)
      setAnimTimes(packet)
    })
    bot.on('clear_titles' as keyof BotEvents, (mes) => {
      setOpen(false)
      if (mes.reset) {
        setTitle(defaultText)
        setSubtitle(defaultText)
        setActionBar(defaultText)
        setAnimTimes({ fadeIn: 400, stay: 3800, fadeOut: 800 })
      }
    })


    // before 1.17
    bot.on('title', (packet: ClientOnMap['title'] | string) => {
      let mes: ClientOnMap['title']
      if (typeof packet === 'string') {
        mes = JSON.parse(packet)
      } else {
        mes = packet
      }
      switch (mes.action) {
        case 0:
          setTitle(JSON.parse(mes.text))
          if (!open) {
            setOpen(true)
          }
          break
        case 1:
          setSubtitle(JSON.parse(mes.text))
          break
        case 2:
          setActionBar(JSON.parse(mes.text))
          if (!open) {
            setOpen(true)
          }
          break
        case 3:
          setAnimTimes({ fadeIn: mes.fadeIn, stay: mes.stay, fadeOut: mes.fadeOut })
          break
        case 4:
          setOpen(false)
          break
        case 5:
          setOpen(false)
          setTitle(defaultText)
          setSubtitle(defaultText)
          setActionBar(defaultText)
          setAnimTimes({ fadeIn: 400, stay: 3800, fadeOut: 800 })
          break
      }
    })
  }, [])

  useEffect(() => {
    let timeoutID: ReturnType<typeof setTimeout> | undefined
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
