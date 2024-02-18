import { useMemo } from 'react'
import { fromFormattedString } from '@xmcl/text-component'
import { formatMessage } from '../botUtils'
import MessageFormatted from './MessageFormatted'

/** like MessageFormatted, but receives raw string or json instead, uses window.loadedData */
export default ({ message }: { message: string | Record<string, any> }) => {
  const messageJson = useMemo(() => {
    return formatMessage(typeof message === 'string' ? fromFormattedString(message) : message)
  }, [message])

  return <MessageFormatted parts={messageJson} />
}
