import { useEffect, useMemo, useState } from 'react'
import { BotEvents } from 'mineflayer'
import type { ClientOnMap } from '../generatedServerPackets'
import Title from './Title'
import type { AnimationTimes } from './Title'


const defaultText: Record<string, any> = { 'text': '' }
const defaultTimings: AnimationTimes = { fadeIn: 400, stay: 3800, fadeOut: 800 }

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
  const [animTimes, setAnimTimes] = useState<AnimationTimes>(defaultTimings)
  const [openTitle, setOpenTitle] = useState(false)
  const [openActionBar, setOpenActionBar] = useState(false)


  const closeTitle = () => {
    setOpenTitle(false)
    // vanilla behavior: if title is closed, subtitle is cleared
    setSubtitle(defaultText)
  }

  useMemo(() => {
    bot._client.on('set_title_text', (packet) => {
      setTitle(JSON.parse(packet.text))
      setOpenTitle(true)
    })
    bot._client.on('set_title_subtitle', (packet) => {
      setSubtitle(JSON.parse(packet.text))
    })
    bot._client.on('action_bar', (packet) => {
      setActionBar(JSON.parse(packet.text))
      setOpenActionBar(true)
    })
    bot._client.on('set_title_time', (packet) => {
      setAnimTimes(ticksToMs(packet))
    })
    bot._client.on('clear_titles', (mes) => {
      closeTitle()
      setOpenActionBar(false)
      if (mes.reset) {
        setTitle(defaultText)
        setSubtitle(defaultText)
        setActionBar(defaultText)
        setAnimTimes(defaultTimings)
      }
    })


    bot.on('set_title_text' as keyof BotEvents, (packet) => {
      setTitle(JSON.parse(packet.text))
      setOpenTitle(true)
    })
    bot.on('set_title_subtitle' as keyof BotEvents, (packet) => {
      setSubtitle(JSON.parse(packet.text))
    })
    bot.on('action_bar' as keyof BotEvents, (packet) => {
      setActionBar(JSON.parse(packet.text))
      setOpenActionBar(true)
    })
    bot.on('set_title_time' as keyof BotEvents, (packet) => {
      setAnimTimes(ticksToMs(packet))
    })
    bot.on('clear_titles' as keyof BotEvents, (mes) => {
      setOpenTitle(false)
      setOpenActionBar(false)
      if (mes.reset) {
        setTitle(defaultText)
        setSubtitle(defaultText)
        setActionBar(defaultText)
        setAnimTimes(defaultTimings)
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
          setOpenTitle(true)
          break
        case 1:
          setSubtitle(JSON.parse(mes.text))
          break
        case 2:
          setActionBar(JSON.parse(mes.text))
          setOpenActionBar(true)
          break
        case 3:
          setAnimTimes(ticksToMs({ fadeIn: mes.fadeIn, stay: mes.stay, fadeOut: mes.fadeOut }))
          break
        case 4:
          setOpenTitle(false)
          setOpenActionBar(false)
          break
        case 5:
          setOpenTitle(false)
          setOpenActionBar(false)
          setTitle(defaultText)
          setSubtitle(defaultText)
          setActionBar(defaultText)
          setAnimTimes(defaultTimings)
          break
      }
    })
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      closeTitle()
    }, animTimes.stay) // only initial stay time is used for title

    return () => {
      clearTimeout(id)
    }
  }, [title, subtitle])

  useEffect(() => {
    const id = setTimeout(() => {
      setOpenActionBar(false)
    }, animTimes.stay)

    return () => {
      clearTimeout(id)
    }
  }, [actionBar])

  return <Title
    title={title}
    subtitle={subtitle}
    actionBar={actionBar}
    transitionTimes={animTimes}
    openTitle={openTitle}
    openActionBar={openActionBar}
  />
}
