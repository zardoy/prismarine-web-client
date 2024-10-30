import { useEffect, useState } from 'react'
import styles from './appStatus.module.css'
import Button from './Button'
import Screen from './Screen'
import LoadingChunks from './LoadingChunks'

export default ({
  status,
  isError,
  hideDots = false,
  lastStatus = '',
  backAction = undefined as undefined | (() => void),
  description = '',
  actionsSlot = null as React.ReactNode | null,
  children
}) => {
  const [loadingDotIndex, setLoadingDotIndex] = useState(0)

  useEffect(() => {
    const statusRunner = async () => {
      const timer = async (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

      const load = async () => {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          setLoadingDotIndex(i => (i + 1) % 4)
          await timer(500) // eslint-disable-line no-await-in-loop
        }
      }

      void load()
    }

    void statusRunner()
  }, [])


  return (
    <Screen
      className='small-content'
      title={
        <>
          <span style={{
            userSelect: isError ? 'text' : undefined,
            wordBreak: 'break-word',
          }}
          >
            {status}
          </span>
          <div style={{ display: 'inline-flex', gap: '1px', }} hidden={hideDots || isError}>
            {
              [...'...'].map((dot, i) => {
                return <span
                  key={i} style={{
                    visibility: loadingDotIndex <= i ? 'hidden' : 'visible',
                  }}>{dot}</span>
              })
            }
          </div>
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
          <Button onClick={() => window.location.reload()} label="Reset App (recommended)" />
        </>
      )}
      {children}
    </Screen>
  )
}
