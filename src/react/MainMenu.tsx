import React, { useEffect, useState } from 'react'
import styles from './mainMenu.module.css'
import Button from './Button'

type Action = (e: React.MouseEvent<HTMLButtonElement>) => void

interface Props {
  connectToServerAction?: Action
  singleplayerAction?: Action
  optionsAction?: Action
  githubAction?: Action
  discordAction?: Action
  openFileAction?: Action
}

const refreshApp = async () => {
  const registration = await navigator.serviceWorker.getRegistration()
  await registration.unregister()
  window.location.reload()
}

export default ({ connectToServerAction, singleplayerAction, optionsAction, githubAction, discordAction, openFileAction }: Props) => {
  const [versionStatus, setVersionStatus] = useState('')
  const [versionTitle, setVersionTitle] = useState('')

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setVersionStatus('(dev)')
    } else {
      fetch('./version.txt').then(async (f) => {
        if (f.status === 404) return
        const contents = await f.text()
        setVersionStatus(`(${contents === process.env.BUILD_VERSION ? 'latest' : 'new version available'})`)
        setVersionTitle(`Loaded: ${process.env.BUILD_VERSION}. Remote: ${contents}`)
      }, () => { })
    }
  }, [])


  return (
    <div>
      <div className={styles['game-title']}>
        <div className={styles.minec}></div>
        <div className={styles.raft}></div>
        <div className={styles.edition}></div>
        <span className={styles.splash}>Prismarine is a beautiful block</span>
      </div>

      <div className={styles.menu}>
        <Button
          onClick={connectToServerAction}
          data-test-id='connect-screen-button'
        >
          Connect to server
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            style={{ width: 170 }}
            onClick={singleplayerAction}
            data-test-id='singleplayer-button'
          >
            Singleplayer
          </Button>

          <Button
            style={{ width: '20px' }}
            data-test-id='select-file-folder'
            icon='pixelarticons:folder'
            onClick={openFileAction}
          />
        </div>
        <Button
          onClick={optionsAction}
        >
          Options
        </Button>
        <div className={styles['menu-row']}>
          <Button
            style={{ width: '98px' }}
            onClick={githubAction}
          >
            GitHub
          </Button>
          <Button
            style={{ width: '98px' }}
            onClick={discordAction}
          >
            Discord
          </Button>
        </div>
      </div>

      <div className={styles['bottom-info']}>
        <span
          title={`${versionTitle} (click to reload)`}
          onClick={refreshApp}
          className={styles['product-info']}
        >
          Prismarine Web Client {versionStatus}
        </span>
        <span className={styles['product-description']}>A Minecraft client in the browser!</span>
      </div>
    </div>
  )
}
