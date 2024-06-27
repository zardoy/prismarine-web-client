import { useSnapshot } from 'valtio'
import { activeModalStack, hideModal } from '../globalState'
import { options } from '../optionsStorage'
import TouchAreasControls from './TouchAreasControls'
import { useIsModalActive, useUsingTouch } from './utilsApp'

export default () => {
  const usingTouch = useUsingTouch()
  const hasModals = useSnapshot(activeModalStack).length !== 0
  const setupActive = useIsModalActive('touch-buttons-setup')
  const { touchControlsPositions, touchControlsType } = useSnapshot(options)

  return <TouchAreasControls
    touchActive={!!bot && !!usingTouch && !hasModals && touchControlsType === 'joystick-buttons'}
    setupActive={setupActive}
    buttonsPositions={touchControlsPositions as any}
    closeButtonsSetup={(newPositions) => {
      if (newPositions) {
        options.touchControlsPositions = newPositions
      }
      hideModal()
    }}
  />

}
