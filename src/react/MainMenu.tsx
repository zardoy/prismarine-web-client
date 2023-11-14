import React, { useEffect, useState } from 'react'
import { openURL } from '../menus/components/common'
import { haveDirectoryPicker } from '../utils'
import styles from './mainMenu.module.css'
import Button from './Button'
import ButtonWithTooltip from './ButtonWithTooltip'

type Action = (e: React.MouseEvent<HTMLButtonElement>) => void

interface Props {
  connectToServerAction?: Action
  singleplayerAction?: Action
  optionsAction?: Action
  githubAction?: Action
  discordAction?: Action
  openFileAction?: Action
  mapsProvider?: string
}

const refreshApp = async () => {
  const registration = await navigator.serviceWorker.getRegistration()
  await registration?.unregister()
  window.location.reload()
}

const httpsRegex = /^https?:\/\//

export default ({ connectToServerAction, mapsProvider, singleplayerAction, optionsAction, githubAction, discordAction, openFileAction }: Props) => {
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
    <div className={styles.root}>
      <div className={styles['game-title']}>
        <div className={styles.minec}></div>
        <div className={styles.raft}></div>
        <div className={styles.edition}></div>
        <span className={styles.splash}>Prismarine is a beautiful block</span>
      </div>

      <div className={styles.menu}>
        <ButtonWithTooltip
          initialTooltip={{
            content: 'Connect to Java servers!',
            placement: 'top',
          }}
          onClick={connectToServerAction}
          data-test-id='connect-screen-button'
        >
          Connect to server
        </ButtonWithTooltip>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <ButtonWithTooltip
            style={{ width: 170 }}
            onClick={singleplayerAction}
            data-test-id='singleplayer-button'
            initialTooltip={{
              content: 'Create worlds and play offline',
              placement: 'left',
              offset: -40
            }}
          >
            Singleplayer
          </ButtonWithTooltip>

          <ButtonWithTooltip
            data-test-id='select-file-folder'
            icon='pixelarticons:folder'
            onClick={openFileAction}
            initialTooltip={{
              content: 'Load any 1.8-1.16 Java world' + (haveDirectoryPicker() ? '' : ' (zip)'),
              placement: 'bottom-start',
            }}
          />
        </div>
        <Button
          onClick={optionsAction}
        >
          Options
        </Button>
        <div className={styles['menu-row']}>
          <ButtonWithTooltip
            initialTooltip={{
              content: 'Report bugs or request features!',
            }}
            style={{ width: '98px' }}
            onClick={githubAction}
          >
            GitHub
          </ButtonWithTooltip>
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

      {mapsProvider &&
        <ButtonWithTooltip
          className={styles['maps-provider']}
          icon='pixelarticons:map'
          initialTooltip={{ content: 'Explore maps to play from provider!', placement: 'right' }}
          onClick={() => openURL(httpsRegex.test(mapsProvider) ? mapsProvider : 'https://' + mapsProvider, false)}
        />}
    </div>
  )
}
