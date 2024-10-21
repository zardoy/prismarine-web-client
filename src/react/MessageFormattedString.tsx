import { useMemo } from 'react'
import { fromFormattedString } from '@xmcl/text-component'
import { formatMessage } from '../chatUtils'
import MessageFormatted from './MessageFormatted'

/** like MessageFormatted, but receives raw string or json instead, uses window.loadedData */
export default ({ message, fallbackColor, className }: {
  message: string | Record<string, any> | null,
  fallbackColor?: string,
  className?: string
}) => {
  const messageJson = useMemo(() => {
    if (!message) return null
    try {
      const texts = formatMessage(typeof message === 'string' ? fromFormattedString(message) : message)
      return texts.map(text => {
        return {
          ...text,
          color: text.color ?? fallbackColor,
        }
      })
    } catch (err) {
      console.error(err) // todo ensure its being logged
      return null
    }
  }, [message])

  return messageJson ? <MessageFormatted parts={messageJson} className={className} /> : null
}
