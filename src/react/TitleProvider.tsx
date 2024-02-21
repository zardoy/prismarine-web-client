import { useEffect, useState } from 'react'
import { proxy, useSnapshot } from 'valtio'
import { disconnect } from '../flyingSquidUtils'
import { MessageFormatPart, formatMessage } from '../botUtils'
import { showModal, hideModal } from '../globalState'
import { options } from '../optionsStorage'
import Title from './Title'
import { useIsModalActive } from './utils'

export default () => {
  const [title, setTitle] = useState<MessageFormatPart[] | null>(null)
  const isTitleActive = useIsModalActive('title-screen')

  useEffect(() => {
    bot.on('chat', (message) => {
      setTitle(message)
    })
  }, [])

  if (!isTitleActive || !title) return null

  return <Title
    title={title} subtitle={[]} actionBar={[]} transitionTimes={{
      fadeIn: 0,
      stay: 5000,
      fadeOut: 0
    }} open={true} />
}
