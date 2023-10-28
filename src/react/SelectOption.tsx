import { proxy, useSnapshot } from 'valtio'
import { hideCurrentModal, showModal } from '../globalState'
import Screen from './Screen'
import { useIsModalActive } from './utils'
import Button from './Button'

const state = proxy({
  title: '',
  options: [] as string[]
})

let resolve
export const showOptionsModal = async <T extends string>(title: string, options: T[]): Promise<T | undefined> => {
  showModal({ reactType: 'general-select' })
  return new Promise((_resolve) => {
    resolve = _resolve
    Object.assign(state, {
      title,
      options
    })
  })
}

export default () => {
  const { title, options } = useSnapshot(state)
  const isModalActive = useIsModalActive('general-select')
  if (!isModalActive) return

  return <Screen title={title} backdrop>
    {options.map(option => <Button key={option} onClick={() => {
      hideCurrentModal()
      resolve(option)
    }}>{option}</Button>)}
    <Button style={{ marginTop: 30 }} onClick={() => {
      hideCurrentModal()
      resolve(undefined)
    }}>Cancel</Button>
  </Screen>
}
