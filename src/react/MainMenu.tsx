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
  versionStatus?: string
  versionTitle?: string
  onVersionClick?: () => void
  bottomRightLinks?: string
}

const httpsRegex = /^https?:\/\//

export default ({
  connectToServerAction,
  mapsProvider,
  singleplayerAction,
  optionsAction,
  githubAction,
  linksButton,
  openFileAction,
  versionStatus,
  versionTitle,
  onVersionClick,
  bottomRightLinks
}: Props) => {
  if (!bottomRightLinks?.trim()) bottomRightLinks = undefined
  const linksParsed = bottomRightLinks?.split(';').map(l => l.split(':')) as Array<[string, string]> | undefined

  return (
    <div className={styles.root}>
      <div className={styles['game-title']}>
        <div className={styles.minecraft}>
          <div className={styles.edition} />
          <span className={styles.splash}>Prismarine is a beautiful block</span>
        </div>
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
          onClick={onVersionClick}
          className={styles['product-info']}
        >
          Prismarine Web Client {versionStatus}
        </span>
        <span className={styles['product-description']}>
          <div className={styles['product-link']}>
            {linksParsed?.map(([name, link], i, arr) => {
              if (!link.startsWith('http')) link = `https://${link}`
              return <div style={{
                color: 'lightgray',
                fontSize: 8,
              }}>
                <a
                  key={name}
                  style={{
                    whiteSpace: 'nowrap',
                  }} href={link}
                >{name}
                </a>
                {i < arr.length - 1 && <span style={{ marginLeft: 2 }}>·</span>}
              </div>
            })}
          </div>
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
