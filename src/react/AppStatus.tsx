import { useEffect, useState } from 'react'
import { guessProblem } from '../guessProblem'
import styles from './appStatus.module.css'
import Button from './Button'
import Screen from './Screen'

export default ({ status, isError, hideDots = false, lastStatus = '', backAction = undefined as undefined | (() => void), actionsSlot = undefined }) => {
  const [loadingDots, setLoadingDots] = useState('')

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

  return (
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
          {backAction && <Button label="Back" onClick={backAction} />}
          {actionsSlot}
          <Button onClick={() => window.location.reload()} label="Full Reload" ></Button>
        </>
      )}
    </Screen>
  )
}
