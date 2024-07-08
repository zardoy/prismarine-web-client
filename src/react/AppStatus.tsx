import { useEffect, useState } from 'react'
import styles from './appStatus.module.css'
import Button from './Button'
import Screen from './Screen'

export default ({ status, isError, hideDots = false, lastStatus = '', backAction = undefined as undefined | (() => void), description = '', actionsSlot = null as React.ReactNode | null }) => {
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
      className='small-content'
      title={
        <>
          <span style={{ userSelect: isError ? 'text' : undefined }}>
            {status}
          </span>
          {isError || hideDots ? '' : loadingDots}
          <p className={styles['potential-problem']}>{description}</p>
          <p className={styles['last-status']}>{lastStatus ? `Last status: ${lastStatus}` : lastStatus}</p>
        </>
      }
      backdrop='dirt'
    >
      {isError && (
        <>
          {backAction && <Button label="Back" onClick={backAction} />}
          {actionsSlot}
          <Button onClick={() => window.location.reload()} label="Reset App (recommended)"></Button>
        </>
      )}
    </Screen>
  )
}
