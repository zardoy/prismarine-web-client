import { useEffect, useState } from 'react'
import { BotEvents } from 'mineflayer'
import type { ClientOnMap } from '../generatedServerPackets'
import Title from './Title'
import type { AnimationTimes } from './Title'


const defaultText: Record<string, any> = { 'text': '' }
const defaultTime: AnimationTimes = { fadeIn: 400, stay: 3800, fadeOut: 800 }

const ticksToMs = (ticks: AnimationTimes) => {
  ticks.fadeIn *= 50
  ticks.stay *= 50
  ticks.fadeOut *= 50
  return ticks
}

export default () => {
  const [title, setTitle] = useState<string | Record<string, any>>(defaultText)
  const [subtitle, setSubtitle] = useState<string | Record<string, any>>(defaultText)
  const [actionBar, setActionBar] = useState<string | Record<string, any>>(defaultText)
  const [animTimes, setAnimTimes] = useState<AnimationTimes>(defaultTime)
  const [open, setOpen] = useState(false)


  useEffect(() => {
    bot._client.on('set_title_text', (packet) => {
      setTitle(JSON.parse(packet.text))
      setOpen(true)
    })
    bot._client.on('set_title_subtitle', (packet) => {
      setSubtitle(JSON.parse(packet.text))
    })
    bot._client.on('action_bar', (packet) => {
      setActionBar(JSON.parse(packet.text))
      setOpen(true)
    })
    bot._client.on('set_title_time', (packet) => {
      setAnimTimes(ticksToMs(packet))
    })
    bot._client.on('clear_titles', (mes) => {
      setOpen(false)
      if (mes.reset) {
        setTitle(defaultText)
        setSubtitle(defaultText)
        setActionBar(defaultText)
        setAnimTimes(defaultTime)
      }
    })


    bot.on('set_title_text' as keyof BotEvents, (packet) => {
      console.log(packet.text)
      setTitle(JSON.parse(packet.text))
      setOpen(true)
    })
    bot.on('set_title_subtitle' as keyof BotEvents, (packet) => {
      setSubtitle(JSON.parse(packet.text))
    })
    bot.on('action_bar' as keyof BotEvents, (packet) => {
      setActionBar(JSON.parse(packet.text))
      setOpen(true)
    })
    bot.on('set_title_time' as keyof BotEvents, (packet) => {
      setAnimTimes(ticksToMs(packet))
    })
    bot.on('clear_titles' as keyof BotEvents, (mes) => {
      setOpen(false)
      if (mes.reset) {
        setTitle(defaultText)
        setSubtitle(defaultText)
        setActionBar(defaultText)
<<<<<<< HEAD
        setAnimTimes({ fadeIn: 400, stay: 3800, fadeOut: 800 })
      }
=======
        setAnimTimes(defaultTime)
      } 
>>>>>>> 15b162f (Title always above crosshair + fades are converted from game ticks + removed some useless code)
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
          setOpen(true)
          break
        case 1:
          setSubtitle(JSON.parse(mes.text))
          break
        case 2:
          setActionBar(JSON.parse(mes.text))
          setOpen(true)
          break
        case 3:
          setAnimTimes(ticksToMs({ fadeIn: mes.fadeIn, stay: mes.stay, fadeOut: mes.fadeOut }))
          break
        case 4:
          setOpen(false)
          break
        case 5:
          setOpen(false)
          setTitle(defaultText)
          setSubtitle(defaultText)
          setActionBar(defaultText)
          setAnimTimes(defaultTime)
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
