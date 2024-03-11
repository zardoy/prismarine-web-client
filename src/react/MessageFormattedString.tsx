import { useMemo } from 'react'
import { fromFormattedString } from '@xmcl/text-component'
import { formatMessage } from '../botUtils'
import MessageFormatted from './MessageFormatted'

/** like MessageFormatted, but receives raw string or json instead, uses window.loadedData */
export default ({ message }: { message: string | Record<string, any> | null }) => {
  const messageJson = useMemo(() => {
    if (!message) return null
    try {
      return formatMessage(typeof message === 'string' ? fromFormattedString(message) : message)
    } catch (err) {
      console.error(err) // todo ensure its being logged
      return null
    }
  }, [message])

  return messageJson ? <MessageFormatted parts={messageJson} /> : null
}
