import { useEffect, useState } from 'react'
import { proxy, useSnapshot } from 'valtio'
import { disconnect } from '../flyingSquidUtils'
import { MessageFormatPart, formatMessage } from '../botUtils'
import { showModal, hideModal } from '../globalState'
import { options } from '../optionsStorage'
import Title from './Title'
import type { AnimationTimes } from './Title'
import { useIsModalActive } from './utils'


const defaultText: MessageFormatPart[] = [{ text: '' }]

export default () => {
  const [title, setTitle] = useState<MessageFormatPart[]>(defaultText)
  const [subtitle, setSubtitle] = useState<MessageFormatPart[]>(defaultText)
  const [actionBar, setActionBar] = useState<MessageFormatPart[]>(defaultText)
  const [animTimes, setAnimTimes] = useState<AnimationTimes>({ fadeIn: 2500, stay: 17_500, fadeOut: 5000 })
  const [open, setOpen] = useState(false)

  const ShowTitle = () => {
    setOpen(true)
    setTimeout(() => {
      setOpen(false) 
    }, animTimes.stay)
    setTimeout(() => {
      setTitle(defaultText)
      setSubtitle(defaultText)
      setActionBar(defaultText)
    }, animTimes.stay + animTimes.fadeOut)
  }

  useEffect(() => {
    bot._client.on('set_title_text', (message) => {
      setTitle([JSON.parse(message.text)])
      if (!open) {
        ShowTitle()
      }
    })
    bot._client.on('set_title_subtitle', (message) => {
      setSubtitle([JSON.parse(message.text)])
    })
    bot._client.on('action_bar', (message) => {
      setActionBar([JSON.parse(message.text)])
      if (!open) {
        ShowTitle()
      }
    })
    bot._client.on('set_title_time', (message) => {
      setAnimTimes([JSON.parse(message.text)])
    })
  }, [])


  return <Title
    title={title}
    subtitle={subtitle}
    actionBar={actionBar}
    transitionTimes={animTimes}
    open={open}
  />
}
