import { join } from 'path'
import { useEffect } from 'react'
import { useSnapshot } from 'valtio'
import { usedServerPathsV1 } from 'flying-squid/dist/lib/modules/world'
import { openURL } from 'prismarine-viewer/viewer/lib/simpleUtils'
import {
  activeModalStack,
  showModal,
  hideModal,
  miscUiState,
  openOptionsMenu
} from '../globalState'
import { fsState } from '../loadSave'
import { disconnect } from '../flyingSquidUtils'
import { pointerLock, setLoadingScreenStatus } from '../utils'
import { closeWan, openToWanAndCopyJoinLink, getJoinLink } from '../localServerMultiplayer'
import { copyFilesAsyncWithProgress, mkdirRecursive, uniqueFileNameFromWorldName } from '../browserfs'
import { useIsModalActive } from './utilsApp'
import { showOptionsModal } from './SelectOption'
import Button from './Button'
import Screen from './Screen'
import styles from './PauseScreen.module.css'

export const saveToBrowserMemory = async () => {
  setLoadingScreenStatus('Saving world')
  try {
    //@ts-expect-error
    const { worldFolder } = localServer.options
    const saveRootPath = await uniqueFileNameFromWorldName(worldFolder.split('/').pop(), `/data/worlds`)
    await mkdirRecursive(saveRootPath)
    for (const copyPath of [...usedServerPathsV1, 'icon.png']) {
      const srcPath = join(worldFolder, copyPath)
      const savePath = join(saveRootPath, copyPath)
      // eslint-disable-next-line no-await-in-loop
      await copyFilesAsyncWithProgress(srcPath, savePath, false)
    }
    return saveRootPath
  } catch (err) {
    void showOptionsModal(`Error while saving the world: ${err.message}`, [])
  } finally {
    setLoadingScreenStatus(undefined)
  }
}

export default () => {
  const isModalActive = useIsModalActive('pause-screen')
  const fsStateSnap = useSnapshot(fsState)
  const activeModalStackSnap = useSnapshot(activeModalStack)
  const { singleplayer, wanOpened } = useSnapshot(miscUiState)

  const handlePointerLockChange = () => {
    if (!pointerLock.hasPointerLock && activeModalStack.length === 0) {
      showModal({ reactType: 'pause-screen' })
    }
  }

  useEffect(() => {
    document.addEventListener('pointerlockchange', handlePointerLockChange)

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
    }
  }, [])

  const onReturnPress = () => {
    hideModal({ reactType: 'pause-screen' })
  }

  const clickWebShareButton = async () => {
    if (!wanOpened) return
    try {
      const url = getJoinLink()
      const shareData = { url }
      await navigator.share?.(shareData)
    } catch (err) {
      console.log(`Error: ${err}`)
    }
  }

  const clickJoinLinkButton = async (qr = false) => {
    if (!qr && wanOpened) {
      closeWan()
      return
    }
    if (!wanOpened || !qr) {
      await openToWanAndCopyJoinLink(() => { }, !qr)
    }
    if (qr) {
      const joinLink = getJoinLink()
      miscUiState.currentDisplayQr = joinLink ?? null
    }
  }

  const openWorldActions = async () => {
    if (fsStateSnap.inMemorySave || !singleplayer) {
      return showOptionsModal('World actions...', [])
    }
    const action = await showOptionsModal('World actions...', ['Save to browser memory'])
    if (action === 'Save to browser memory') {
      await saveToBrowserMemory()
    }
  }

  if (!isModalActive) return null
  return <Screen title='Game Menu'>
    <Button
      icon={'pixelarticons:folder'}
      style={{ position: 'fixed', top: '5px', left: 'calc(env(safe-area-inset-left) + 5px)' }}
      onClick={async () => openWorldActions()}
    />
    <div className={styles.pause_container}>
      <Button className="button" style={{ width: '204px' }} onClick={onReturnPress}>Back to Game</Button>
      <div className={styles.row}>
        <Button className="button" style={{ width: '98px' }} onClick={() => openURL(process.env.GITHUB_URL!)}>GitHub</Button>
        <Button className="button" style={{ width: '98px' }} onClick={() => openURL('https://discord.gg/4Ucm684Fq3')}>Discord</Button>
      </div>
      <Button className="button" style={{ width: '204px' }} onClick={() => openOptionsMenu('main')}>Options</Button>
      {singleplayer ? (
        <div className={styles.row}>
          <Button className="button" style={{ width: '170px' }} onClick={async () => clickJoinLinkButton()}>
            {wanOpened ? 'Close Wan' : 'Copy Join Link'}
          </Button>
          {(navigator.share as typeof navigator.share | undefined) ? (
            <Button
              className="button"
              icon={'pixelarticons:arrow-up'}
              style={{ width: '20px' }}
              onClick={async () => clickWebShareButton()}
            />
          ) : null}
          <Button
            className="button"
            icon={'pixelarticons:dice'}
            style={{ width: '20px' }}
            onClick={async () => clickJoinLinkButton(true)}
          />
        </div>
      ) : null}
      <Button className="button" style={{ width: '204px' }} onClick={disconnect}>
        {localServer && !fsState.syncFs && !fsState.isReadonly ? 'Save & Quit' : 'Disconnect & Reset'}
      </Button>
    </div>
  </Screen>
}
