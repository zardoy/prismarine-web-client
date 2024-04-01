//@ts-nocheck
// to fix select!
import React, { useEffect } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil' // Assuming you're using Recoil for state management
import { hideCurrentModal, showModal, miscUiState, notification, openOptionsMenu } from '../globalState'
import { fsState } from '../loadSave'
import { saveWorld } from '../builtinCommands'
import { disconnect } from '../utils'
import { closeWan, openToWanAndCopyJoinLink, getJoinLink } from '../localServerMultiplayer'
import { openURL } from './components/common'
import Button from './Button'
import Screen from './Screen'

export default () => {
  const [, setFsState] = useRecoilState(fsState) // Adjust this based on your Recoil setup
  const singleplayer = useRecoilValue(miscUiState.singleplayer)
  const isOpenedToWan = useRecoilValue(miscUiState.wanOpened)

  const onReturnPress = () => {
    hideCurrentModal()
  }

  const clickJoinLinkButton = async (qr = false) => {
    if (!qr && isOpenedToWan) {
      closeWan()
      return
    }
    if (!isOpenedToWan || !qr) {
      await openToWanAndCopyJoinLink(() => { }, !qr)
    }
    if (qr) {
      const joinLink = getJoinLink()
      miscUiState.currentDisplayQr = joinLink
    }
  }

  useEffect(() => {
    // Subscribe to fsState changes
    const fsStateSubscription = fsState.subscribe(() => {
      setFsState(fsState)
    })

    // Subscribe to miscUiState changes
    const singleplayerSubscription = miscUiState.subscribeKey('singleplayer', () => {
      // Update component state as needed
    })

    const wanOpenedSubscription = miscUiState.subscribeKey('wanOpened', () => {
      // Update component state as needed
    })

    // Unsubscribe from subscriptions on component unmount
    return () => {
      fsStateSubscription()
      singleplayerSubscription()
      wanOpenedSubscription()
    }
  }, [])

  return (
    <Screen title='Game Menu'>
      <main>
        <Button className="button" style={{ width: '204px' }} onClick={onReturnPress}>Back to Game</Button>
        <div className="row">
          <Button className="button" style={{ width: '98px' }} onClick={() => openURL(process.env.GITHUB_URL)}>GitHub</Button>
          <Button className="button" style={{ width: '98px' }} onClick={() => openURL('https://discord.gg/4Ucm684Fq3')}>Discord</Button>
        </div>
        <button className="button" style={{ width: '204px' }} onClick={() => openOptionsMenu('main')}>Options</button>
        {singleplayer ? (
          <div className="row">
            <Button className="button" style={{ width: '170px' }} onClick={async () => clickJoinLinkButton()}>
              {isOpenedToWan ? 'Close Wan' : 'Copy Join Link'}
            </Button>
            <Button className="button" style={{ height: '0' }} onClick={async () => clickJoinLinkButton(true)}>Copy Link</Button>
          </div>
        ) : ''}
        <Button className="button" style={{ width: '204px' }} onClick={disconnect}>
          {localServer && !fsState.syncFs && !fsState.isReadonly ? 'Save & Quit' : 'Disconnect'}
        </Button>
      </main>
    </Screen>
  )
}
