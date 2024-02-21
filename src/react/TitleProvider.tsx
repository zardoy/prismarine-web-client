import { useEffect } from 'react'
import { proxy, useSnapshot } from 'valtio'
import { disconnect } from '../flyingSquidUtils'
import { MessageFormatPart, formatMessage } from '../botUtils'
import { showModal, hideModal } from '../globalState'
import { options } from '../optionsStorage'
import Title from './Title'
import { useIsModalActive } from './utils'
import { AnimationTimes } from './FadeTransition.tsx'

const titleProxy = proxy({ value: null as MessageFormatPart[] | null })

type TextEvent = {
  animationTimes: AnimationTimes,
  titleText: string,
  subtitleText: string,
  actionBarText: string,
}

export default () => {
  const { value: title } = useSnapshot(titleProxy)
  const isTitleActive = useIsModalActive('title-screen')

  useEffect(() => {
    bot._client.on('set_title_text', (data: Pick<TextEvent, 'titleText'>) => {
      try {
        const messageParsed = JSON.parse(data.titleText)
        const parts = formatMessage(messageParsed)
        titleProxy.value = parts
      } catch (err) {
        console.error(err)
      }
    })
  }, [])

  if (!isTitleActive || !title || options.autoRespawn) return null

  return <Title
    title={title as MessageFormatPart[]}
  />
}
