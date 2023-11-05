import { proxy, useSnapshot } from 'valtio'
import { activeModalStacks, hideModal, insertActiveModalStack, miscUiState } from '../globalState'
import { resetLocalStorageWorld } from '../browserfs'
import { fsState } from '../loadSave'
import AppStatus from './AppStatus'
import DiveTransition from './DiveTransition'
import { useDidUpdateEffect, useIsModalActive } from './utils'
import Button from './Button'

const initialState = {
  status: '',
  lastStatus: '',
  maybeRecoverable: true,
  isError: false,
  hideDots: false,
}
export const appStatusState = proxy(initialState)
const resetState = () => {
  Object.assign(appStatusState, initialState)
}

export default () => {
  const { isError, lastStatus, maybeRecoverable, status, hideDots } = useSnapshot(appStatusState)

  const isOpen = useIsModalActive('app-status')

  useDidUpdateEffect(() => {
    // todo play effect only when world successfully loaded
    if (!isOpen) {
      const divingElem: HTMLElement = document.querySelector('#viewer-canvas')!
      divingElem.style.animationName = 'dive-animation'
      divingElem.parentElement!.style.perspective = '1200px'
      divingElem.onanimationend = () => {
        divingElem.parentElement!.style.perspective = ''
        divingElem.onanimationend = null
      }
    }
  }, [isOpen])

  return <DiveTransition open={isOpen}>
    <AppStatus
      status={status}
      isError={isError}
      hideDots={hideDots}
      lastStatus={lastStatus}
      backAction={maybeRecoverable ? () => {
        appStatusState.isError = false
        resetState()
        miscUiState.gameLoaded = false
        miscUiState.loadedDataVersion = null
        window.loadedData = undefined
        if (activeModalStacks['main-menu']) {
          insertActiveModalStack('main-menu')
        } else {
          hideModal(undefined, undefined, { force: true })
        }
      } : undefined}
      // actionsSlot={
      //   <Button hidden={!(miscUiState.singleplayer && fsState.inMemorySave)} label="Reset world" onClick={() => {
      //     if (window.confirm('Are you sure you want to delete all local world content?')) {
      //       resetLocalStorageWorld()
      //       window.location.reload()
      //     }
      //   }} />
      // }
    />
  </DiveTransition>
}
