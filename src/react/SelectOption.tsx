import { proxy, useSnapshot } from 'valtio'
import { hideCurrentModal, showModal } from '../globalState'
import { parseFormattedMessagePacket } from '../botUtils'
import Screen from './Screen'
import { useIsModalActive } from './utilsApp'
import Button from './Button'
import MessageFormattedString from './MessageFormattedString'

const state = proxy({
  title: '',
  options: [] as string[],
  showCancel: true,
  minecraftJsonMessage: null as null | Record<string, any>,
  behavior: 'resolve-close' as 'resolve-close' | 'close-resolve',
})

let resolve
export const showOptionsModal = async <T extends string> (
  title: string,
  options: T[],
  { cancel = true, minecraftJsonMessage }: { cancel?: boolean, minecraftJsonMessage? } = {}
): Promise<T | undefined> => {
  showModal({ reactType: 'general-select' })
  let minecraftJsonMessageParsed
  if (minecraftJsonMessage) {
    const parseResult = parseFormattedMessagePacket(minecraftJsonMessage)
    minecraftJsonMessageParsed = parseResult.formatted
    if (parseResult.plain) {
      title += ` (${parseResult.plain})`
    }
  }
  return new Promise((_resolve) => {
    resolve = _resolve
    Object.assign(state, {
      title,
      options,
      showCancel: cancel,
      minecraftJsonMessage: minecraftJsonMessageParsed
    })
  })
}

export default () => {
  const { title, options, showCancel, minecraftJsonMessage } = useSnapshot(state)
  const isModalActive = useIsModalActive('general-select')
  if (!isModalActive) return

  const resolveClose = (value: string | undefined) => {
    if (state.behavior === 'resolve-close') {
      resolve(value)
      hideCurrentModal()
    } else {
      hideCurrentModal()
      resolve(value)
    }
  }

  return <Screen title={title} backdrop>
    {minecraftJsonMessage && <div style={{ textAlign: 'center', }}>
      <MessageFormattedString message={minecraftJsonMessage} />
    </div>}
    {options.map(option => <Button
      key={option} onClick={() => {
        resolveClose(option)
      }}
    >{option}
    </Button>)}
    {showCancel && <Button
      style={{ marginTop: 30 }} onClick={() => {
        resolveClose(undefined)
      }}
    >Cancel
    </Button>}
  </Screen>
}
