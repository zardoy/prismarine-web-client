import { useEffect, useState } from 'react'
import { proxy, useSnapshot } from 'valtio'
import { activeModalStacks, hideModal, insertActiveModalStack, miscUiState } from '../globalState'
import { guessProblem } from '../guessProblem'
import { fsState } from '../loadSave'
import { resetLocalStorageWorld } from '../browserfs'
import styles from './loadingErrorScreen.module.css'
import Button from './Button'
import Screen from './Screen'
import DiveTransition from './DiveTransition'
import { isModalActive, useDidUpdateEffect } from './utils'

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
  const [loadingDots, setLoadingDots] = useState('')
  const isOpen = isModalActive('app-status')

  useEffect(() => {
    void statusRunner()
  }, [])

  const statusRunner = async () => {
    const array = ['.', '..', '...', '']

    const timer = async (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

    const load = async () => {
      // eslint-disable-next-line no-constant-condition
      for (let i = 0; true; i = (i + 1) % array.length) {
        setLoadingDots(array[i])
        await timer(500) // eslint-disable-line no-await-in-loop
      }
    }

    void load()
  }

  useDidUpdateEffect(() => {
    // todo play effect only when world successfully loaded
    if (!isOpen) {
      const divingElem: HTMLElement = document.querySelector('#viewer-canvas')
      divingElem.style.animationName = 'dive-animation'
      divingElem.parentElement.style.perspective = '1200px'
      divingElem.onanimationend = () => {
        divingElem.parentElement.style.perspective = ''
        divingElem.onanimationend = null
      }
    }
  }, [isOpen])

  return (
    <DiveTransition open={isOpen}>
      <Screen
        title={
          <>
            {status}
            {isError || hideDots ? '' : loadingDots}
            <p className={styles['potential-problem']}>{isError ? guessProblem(status) : ''}</p>
            <p className={styles['last-status']}>{lastStatus ? `Last status: ${lastStatus}` : lastStatus}</p>
          </>
        }
        backdrop='dirt'
      >
        {isError && (
          <>
            <Button hidden={!maybeRecoverable} label="Back" onClick={() => {
              appStatusState.isError = false
              resetState()
              miscUiState.gameLoaded = false
              miscUiState.loadedDataVersion = undefined
              window.loadedData = undefined
              if (activeModalStacks['main-menu']) {
                insertActiveModalStack('main-menu')
              } else {
                hideModal(undefined, undefined, { force: true })
              }
            }}
            ></Button>
            <Button hidden={!(miscUiState.singleplayer && fsState.inMemorySave)} label="Reset world" onClick={() => {
              if (window.confirm('Are you sure you want to delete all local world content?')) {
                resetLocalStorageWorld()
                window.location.reload()
              }
            }}
            ></Button>
            <Button onClick={() => window.location.reload()} label="Full Reload" ></Button>
          </>
        )}
      </Screen>
    </DiveTransition>
  )
}
