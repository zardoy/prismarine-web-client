//@ts-check
const { LitElement, html, css } = require('lit')
const { subscribe } = require('valtio')
const { subscribeKey } = require('valtio/utils')
const { hideCurrentModal, showModal, miscUiState, notification, openOptionsMenu } = require('../globalState')
const { fsState } = require('../loadSave')
const { disconnect } = require('../utils')
const { closeWan, openToWanAndCopyJoinLink, getJoinLink } = require('../localServerMultiplayer')
const { uniqueFileNameFromWorldName, copyFilesAsyncWithProgress } = require('../browserfs')
const { showOptionsModal } = require('../react/SelectOption')
const { openURL } = require('./components/common')

class PauseScreen extends LitElement {
  static get styles () {
    return css`
      .bg {
        position: absolute;
        top: 0;
        left: 0;
        background: rgba(0, 0, 0, 0.75);
        width: 100%;
        height: 100%;
      }

      .title {
        position: absolute;
        top: 40px;
        left: 50%;
        transform: translate(-50%);
        font-size: 10px;
        color: white;
        text-shadow: 1px 1px #222;
      }

      main {
        display: flex;
        flex-direction: column;
        gap: 4px 0;
        position: absolute;
        left: 50%;
        width: 204px;
        top: calc(48px);
        transform: translate(-50%);
      }

      .row {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        width: 100%;
      }
    `
  }

  constructor () {
    super()

    subscribe(fsState, () => {
      this.requestUpdate()
    })
    subscribeKey(miscUiState, 'singleplayer', () => this.requestUpdate())
    subscribeKey(miscUiState, 'wanOpened', () => this.requestUpdate())
  }

  async openWorldActions () {
    if (fsState.inMemorySave || !miscUiState.singleplayer) {
      return showOptionsModal('World actions...', [])
    }
    const action = await showOptionsModal('World actions...', ['Save to browser memory'])
    if (action === 'Save to browser memory') {
      //@ts-expect-error
      const { worldFolder } = localServer.options
      const savePath = await uniqueFileNameFromWorldName(worldFolder.split('/').pop(), `/data/worlds`)
      await copyFilesAsyncWithProgress(worldFolder, savePath)
    }
  }

  render () {
    const joinButton = miscUiState.singleplayer
    const isOpenedToWan = miscUiState.wanOpened

    return html`
      <div class="bg"></div>
      <!-- todo uncomment when browserfs is fixed -->
      <!--<pmui-button style="position:fixed;left: 5px;top: 5px;" pmui-icon="pixelarticons:folder" pmui-width="20px" pmui-label="" @pmui-click=${async () => this.openWorldActions()}></pmui-button>-->

      <p class="title">Game Menu</p>

      <main>
        <pmui-button pmui-width="204px" pmui-label="Back to Game" @pmui-click=${this.onReturnPress}></pmui-button>
        <div class="row">
          <pmui-button pmui-width="98px" pmui-label="GitHub" @pmui-click=${() => openURL(
      // @ts-expect-error
      process.env.GITHUB_URL)}></pmui-button>
          <pmui-button pmui-width="98px" pmui-label="Discord" @pmui-click=${() => openURL('https://discord.gg/4Ucm684Fq3')}></pmui-button>
        </div>
        <pmui-button pmui-width="204px" pmui-label="Options" @pmui-click=${() => openOptionsMenu('main')}></pmui-button>
        <!-- todo use qr icon (full pixelarticons package) -->
        <!-- todo also display copy link button when opened -->
        ${joinButton ? html`
          <div class="row">
            <pmui-button pmui-width="170px" pmui-label="${miscUiState.wanOpened ? 'Close Wan' : 'Copy Join Link'}" @pmui-click=${async () => this.clickJoinLinkButton()}></pmui-button>
            <pmui-button style="height: 0;" pmui-icon="pixelarticons:dice" pmui-width="20px" pmui-label="" @pmui-click=${async () => this.clickJoinLinkButton(true)}></pmui-button>
          </div>
        ` : ''}
        <pmui-button pmui-width="204px" pmui-label="${localServer && !fsState.syncFs && !fsState.isReadonly ? 'Save & Quit' : 'Disconnect'}" @pmui-click=${async () => {
        disconnect()
      }}></pmui-button>
      </main>
    `
  }

  async clickJoinLinkButton (qr = false) {
    if (!qr && miscUiState.wanOpened) {
      closeWan()
      return
    }
    if (!miscUiState.wanOpened || !qr) {
      await openToWanAndCopyJoinLink(() => { }, !qr)
    }
    if (qr) {
      const joinLink = getJoinLink()
      //@ts-expect-error
      miscUiState.currentDisplayQr = joinLink

    }
  }

  show () {
    this.focus()
    // todo?
    notification.show = false
  }

  onReturnPress () {
    hideCurrentModal()
  }
}

window.customElements.define('pmui-pausescreen', PauseScreen)
