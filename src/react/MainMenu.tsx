import React, { useEffect, useState, useRef, CSSProperties } from 'react'
import { openURL } from 'prismarine-viewer/viewer/lib/simpleUtils'
import { useFloating, arrow, FloatingArrow, offset as offsetMiddleware, Placement } from '@floating-ui/react'
import { haveDirectoryPicker } from '../utils'
import { activeModalStack } from '../globalState'
import styles from './mainMenu.module.css'
import Button from './Button'
import ButtonWithTooltip from './ButtonWithTooltip'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'

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
  onVersionClick
}: Props) => {
  return (
    <div className={styles.root}>
      <div className={styles['game-title']}>
        <div className={styles.minecraft}>
          <div className={styles.edition}></div>
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


export type DropdownButtonItem = {
  text: string,
  clickHandler: () => void
}

export const DropdownButton = ({ text, links }: { text: string, links: DropdownButtonItem[] }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen
  })

  const styles: CSSProperties = {
    ...floatingStyles,
    background: 'rgba(0, 0, 0, 0.3)',
    fontSize: 8,
    userSelect: 'text',
    padding: '2px 4px',
    opacity: 1,
    transition: 'opacity 0.3s ease-in-out',
    textShadow: '1px 1px 2px BLACK',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 11
  }

  return <>
    <Button
      style={{ position: 'relative', width: '98px' }}
      rootRef={refs.setReference}
      onClick={()=>{
        setIsOpen(!isOpen)
      }}
    >{text}<PixelartIcon
        styles={{ position: 'absolute', top: '5px', right: '5px' }}
        iconName={isOpen ? 'chevron-up' : 'chevron-down'}
      />
    </Button>
    {
      isOpen && <div ref={refs.setFloating} style={styles}>
        {links.map(el => {
          return <Button
            style={{ width: '98px' }}
            onClick={el.clickHandler}
          >{el.text}</Button>
        })}
      </div>
    }
  </>
}
