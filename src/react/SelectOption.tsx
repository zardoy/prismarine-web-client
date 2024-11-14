import { proxy, useSnapshot } from 'valtio'
import { hideCurrentModal, showModal } from '../globalState'
import Screen from './Screen'
import { useIsModalActive } from './utilsApp'
import Button from './Button'

const state = proxy({
  title: '',
  options: [] as string[],
  showCancel: true,
  behavior: 'resolve-close' as 'resolve-close' | 'close-resolve',
})

let resolve
export const showOptionsModal = async <T extends string> (
  title: string,
  options: T[],
  { cancel = true }: { cancel?: boolean } = {}
): Promise<T | undefined> => {
  showModal({ reactType: 'general-select' })
  return new Promise((_resolve) => {
    resolve = _resolve
    Object.assign(state, {
      title,
      options,
      showCancel: cancel,
    })
  })
}

export default () => {
  const { title, options, showCancel } = useSnapshot(state)
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
