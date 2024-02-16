import { useSnapshot } from 'valtio'
import { activeModalStack } from '../globalState'
import TouchAreasControls from './TouchAreasControls'
import { useIsModalActive, useUsingTouch } from './utils'

export default () => {
  const usingTouch = useUsingTouch()
  const hasModals = useSnapshot(activeModalStack).length !== 0
  const setupActive = useIsModalActive('touch-areas-setup')

  return <TouchAreasControls touchActive={usingTouch && hasModals} setupActive={setupActive} />
}
