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
    bot._client.on('set_title_text', (packet) => {
      setTitle([JSON.parse(packet.text)])
      if (!open) {
        setOpen(true)
      }
    })
    bot._client.on('set_title_subtitle', (packet) => {
      setSubtitle([JSON.parse(packet.text)])
    })
    bot._client.on('action_bar', (packet) => {
      setActionBar([JSON.parse(packet.text)])
      if (!open) {
        setOpen(true)
      }
    })
    bot._client.on('set_title_time', (packet) => {
      setAnimTimes(JSON.parse(packet.text))
    })
    bot._client.on('clear_titles', (packet) => {
      const mes = JSON.parse(packet.text)
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


    bot.on('set_title_text' as keyof BotEvents, (packet) => {
      console.log(packet)
      setTitle([JSON.parse(packet.text)])
      if (!open) {
        setOpen(true)
      }
    })
    bot.on('set_title_subtitle' as keyof BotEvents, (packet) => {
      setSubtitle([JSON.parse(packet.text)])
    })
    bot.on('action_bar' as keyof BotEvents, (packet) => {
      setActionBar([JSON.parse(packet.text)])
      if (!open) {
        setOpen(true)
      }
    })
    bot.on('set_title_time' as keyof BotEvents, (packet) => {
      setAnimTimes(JSON.parse(packet.text))
    })
    bot.on('clear_titles' as keyof BotEvents, (packet) => {
      const mes = JSON.parse(packet.text)
      setOpen(false)
      if (mes.reset) {
        setTitle(defaultText)
        setSubtitle(defaultText)
        setActionBar(defaultText)
        setAnimTimes({ fadeIn: 400, stay: 3800, fadeOut: 800 })
      } 
    })


    // before 1.17
    bot.on('title', (mes) => {
      switch (mes.action) {
        case 0:
          console.log(mes)
          setTitle([JSON.parse(mes.text)])
          if (!open) {
            setOpen(true)
          }
          break
        case 1:
          console.log(mes)
          setSubtitle([JSON.parse(mes.text)])
          break
        case 2:
          console.log(mes)
          setActionBar([JSON.parse(mes.text)])
          if (!open) {
            setOpen(true)
          }
          break
        case 3:
          console.log(mes)
          setAnimTimes({ fadeIn: mes.fadeIn, stay: mes.stay, fadeOut: mes.fadeOut })
          break
        case 4:
          console.log(mes)
          setOpen(false)
          break
        // case 5:
        //   console.log(mes)
        //   // setOpen(false)
        //   setTitle(defaultText)
        //   setSubtitle(defaultText)
        //   setActionBar(defaultText)
        //   setAnimTimes({ fadeIn: 400, stay: 3800, fadeOut: 800 })
        //   break
        // default: 
        //   console.log(mes)
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
