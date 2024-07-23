import React, { useEffect, useState } from 'react'
import { openURL } from 'prismarine-viewer/viewer/lib/simpleUtils'
import { haveDirectoryPicker } from '../utils'
import { activeModalStack } from '../globalState'
import styles from './mainMenu.module.css'
import Button from './Button'
import ButtonWithTooltip from './ButtonWithTooltip'
import { pixelartIcons } from './PixelartIcon'

type Action = (e: React.MouseEvent<HTMLButtonElement>) => void

interface Props {
  connectToServerAction?: Action
  singleplayerAction?: Action
  optionsAction?: Action
  githubAction?: Action
  linksButton?: JSX.Element
  openFileAction?: Action
  mapsProvider?: string
}

const refreshApp = async (failedUpdate = false) => {
  const registration = await navigator.serviceWorker.getRegistration()
  await registration?.unregister()
  if (failedUpdate) {
    await new Promise(resolve => {
      setTimeout(resolve, 2000)
    })
  }
  if (activeModalStack.length !== 0) return
  if (failedUpdate) {
    sessionStorage.justReloaded = false
    // try to force bypass cache
    location.search = '?update=true'
  } else {
    window.justReloaded = true
    sessionStorage.justReloaded = true
    window.location.reload()
  }
}

const httpsRegex = /^https?:\/\//

export default ({ connectToServerAction, mapsProvider, singleplayerAction, optionsAction, githubAction, linksButton, openFileAction }: Props) => {
  const [versionStatus, setVersionStatus] = useState('')
  const [versionTitle, setVersionTitle] = useState('')

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setVersionStatus('(dev)')
    } else {
      fetch('./version.txt').then(async (f) => {
        if (f.status === 404) return
        const contents = await f.text()
        const isLatest = contents === process.env.BUILD_VERSION
        if (!isLatest && sessionStorage.justReloaded) {
          setVersionStatus('(force reloading, wait)')
          void refreshApp(true)
          return
        }
        setVersionStatus(`(${isLatest ? 'latest' : 'new version available'})`)
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
          data-test-id='servers-screen-button'
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
            icon={pixelartIcons.folder}
            onClick={openFileAction}
            initialTooltip={{
              content: 'Load any Java world save' + (haveDirectoryPicker() ? '' : ' (zip)!'),
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
          {linksButton}
        </div>
      </div>

      <div className={styles['bottom-info']}>
        <span
          title={`${versionTitle} (click to reload)`}
          onClick={async () => {
            setVersionStatus('(reloading)')
            await refreshApp()
          }}
          className={styles['product-info']}
        >
          Prismarine Web Client {versionStatus}
        </span>
        <span className={styles['product-description']}>
          <a style={{
            color: 'lightgray',
            fontSize: 9,
          }} href='https://privacy.mcraft.fun'>Privacy Policy</a>
          <span>A Minecraft client in the browser!</span>
        </span>
      </div>

      {mapsProvider &&
        <ButtonWithTooltip
          className={styles['maps-provider']}
          icon={pixelartIcons.map}
          initialTooltip={{ content: 'Explore maps to play from provider!', placement: 'right' }}
          onClick={() => openURL(httpsRegex.test(mapsProvider) ? mapsProvider : 'https://' + mapsProvider, false)}
        />}
    </div>
  )
}
