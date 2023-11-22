//@ts-check
const { LitElement, html, css } = require('lit')
const viewerSupportedVersions = require('prismarine-viewer/viewer/supportedVersions.json')
const { hideCurrentModal, miscUiState } = require('../globalState')
const { default: supportedVersions } = require('../supportedVersions.mjs')
const { commonCss } = require('./components/common')

const fullySupporedVersions = viewerSupportedVersions

class PlayScreen extends LitElement {
  static get styles () {
    return css`
      ${commonCss}
      .title {
        top: 12px;
      }

      .edit-boxes {
        position: fixed;
        top: 59px;
        left: 50%;
        display: flex;
        flex-direction: column;
        gap: 14px 0;
        transform: translate(-50%);
        width: 310px;
      }

      .wrapper {
        width: 100%;
        display: flex;
        flex-direction: row;
        gap: 0 4px;
      }

      .button-wrapper {
        display: flex;
        flex-direction: row;
        gap: 0 4px;
        position: absolute;
        bottom: 9px;
        left: 50%;
        transform: translate(-50%);
        width: 310px;
      }

      .extra-info-version {
        font-size: 10px;
        color: rgb(206, 206, 206);
        text-shadow: 1px 1px black;
        position: absolute;
        left: calc(50% + 2px);
        bottom: -34px;
      }

      .extra-info-proxy {
        font-size: 8px;
        color: rgb(206, 206, 206);
        text-shadow: 1px 1px black;
        margin:0;
        margin-top:-12px;
      }

      a {
        color: white;
      }
    `
  }

  static get properties () {
    return {
      server: { type: String },
      serverImplicit: { type: String },
      serverport: { type: Number },
      proxy: { type: String },
      proxyImplicit: { type: String },
      proxyport: { type: Number },
      username: { type: String },
      password: { type: String },
      version: { type: String }
    }
  }

  constructor () {
    super()
    this.version = ''
    this.serverport = ''
    this.proxyport = ''
    this.server = ''
    this.proxy = ''
    this.username = ''
    this.password = ''
    this.serverImplicit = ''
    this.proxyImplicit = ''
    // todo set them sooner add indicator
    void window.fetch('config.json').then(async res => res.json()).then(c => c, (error) => {
      console.warn('Failed to load optional config.json', error)
      return {}
    }).then(async (/** @type {import('../globalState').AppConfig} */config) => {
      miscUiState.appConfig = config
      const params = new URLSearchParams(window.location.search)

      const getParam = (localStorageKey, qs = localStorageKey) => {
        const qsValue = qs ? params.get(qs) : undefined
        if (qsValue) {
          this.style.display = 'block'
        }
        return qsValue || window.localStorage.getItem(localStorageKey)
      }

      if (config.defaultHost === '<from-proxy>' || config.defaultHostSave === '<from-proxy>') {
        let proxy = config.defaultProxy || config.defaultProxySave || params.get('proxy')
        const cleanUrl = url => url.replaceAll(/(https?:\/\/|\/$)/g, '')
        if (proxy && cleanUrl(proxy) !== cleanUrl(location.origin + location.pathname)) {
          if (!proxy.startsWith('http')) proxy = 'https://' + proxy
          const proxyConfig = await fetch(proxy + '/config.json').then(async res => res.json()).then(c => c, (error) => {
            console.warn(`Failed to load config.json from proxy ${proxy}`, error)
            return {}
          })
          if (config.defaultHost === '<from-proxy>' && proxyConfig.defaultHost) {
            config.defaultHost = proxyConfig.defaultHost
          } else {
            config.defaultHost = ''
          }
          if (config.defaultHostSave === '<from-proxy>' && proxyConfig.defaultHostSave) {
            config.defaultHostSave = proxyConfig.defaultHostSave
          } else {
            config.defaultHostSave = ''
          }
        }
        this.server = this.serverImplicit
      }

      this.serverImplicit = config.defaultHost ?? ''
      this.proxyImplicit = config.defaultProxy ?? ''
      this.server = getParam('server', 'ip') ?? config.defaultHostSave ?? ''
      this.proxy = getParam('proxy') ?? config.defaultProxySave ?? ''
      this.version = getParam('version') || (window.localStorage.getItem('version') ?? config.defaultVersion ?? '')
      this.username = getParam('username') || 'pviewer' + (Math.floor(Math.random() * 1000))
      this.password = getParam('password') || ''
      if (process.env.NODE_ENV === 'development' && params.get('reconnect') && this.server && this.username) {
        this.onConnectPress()
      }
    })
  }

  render () {
    return html`
      <div class="backdrop"></div>

      <p class="title">Join a Server</p>

      <main class="edit-boxes">
        <div class="wrapper">
          <pmui-editbox
            pmui-width="150px"
            pmui-label="Server IP"
            pmui-id="serverip"
            pmui-value="${this.server}"
            pmui-type="url"
            pmui-required="${this.serverImplicit === ''}}"
            pmui-placeholder="${this.serverImplicit}"
            .autocompleteValues=${JSON.parse(localStorage.getItem('serverHistory') || '[]')}
            @input=${e => { this.server = e.target.value }}
          ></pmui-editbox>
          <pmui-editbox
            pmui-width="150px"
            pmui-label="Server Port"
            pmui-id="port"
            pmui-value="${this.serverport}"
            pmui-type="number"
            pmui-placeholder="25565"
            @input=${e => { this.serverport = e.target.value }}
            ></pmui-editbox>
        </div>
        <div class="wrapper">
          <pmui-editbox
            pmui-width="150px"
            pmui-label="Proxy IP"
            pmui-id="proxy"
            pmui-value="${this.proxy}"
            pmui-required="${this.proxyImplicit === ''}}"
            pmui-placeholder="${this.proxyImplicit}"
            pmui-type="url"
            @input=${e => { this.proxy = e.target.value }}
          ></pmui-editbox>
          <pmui-editbox
            pmui-width="150px"
            pmui-label="Proxy Port"
            pmui-id="port"
            pmui-value="${this.proxyport}"
            pmui-type="number"
            @input=${e => { this.proxyport = e.target.value }}
          ></pmui-editbox>
        </div>
        <div class="wrapper">
          <p class="extra-info-proxy">Enter proxy url you want to use. <a href="https://github.com/zardoy/prismarine-web-client/issues/3">Learn more</a>.</p>
        </div>
        <div class="wrapper">
          <pmui-editbox
            pmui-width="150px"
            pmui-label="Username"
            pmui-id="username"
            pmui-value="${this.username}"
            @input=${e => { this.username = e.target.value }}
          ></pmui-editbox>
          <pmui-editbox
            pmui-width="150px"
            pmui-label="Bot Version"
            pmui-id="botversion"
            pmui-value="${this.version}"
            pmui-inputmode="decimal"
            state="${this.version && (fullySupporedVersions.includes(/** @type {any} */(this.version)) ? '' : supportedVersions.includes(this.version) ? 'warning' : 'invalid')}"
            .autocompleteValues=${fullySupporedVersions}
            @input=${e => { this.version = e.target.value = e.target.value.replaceAll(',', '.') }}
          ></pmui-editbox>
        </div>
        <p class="extra-info-version">Leave blank and it will be chosen automatically</p>
      </main>

      <div class="button-wrapper">
        <pmui-button pmui-test-id="connect-to-server" pmui-width="150px" pmui-label="Connect" @pmui-click=${this.onConnectPress}></pmui-button>
        <pmui-button pmui-width="150px" pmui-label="Cancel" @pmui-click=${() => hideCurrentModal()}></pmui-button>
      </div>
    `
  }

  onConnectPress () {
    const server = this.server ? `${this.server}${this.serverport && `:${this.serverport}`}` : this.serverImplicit
    const proxy = this.proxy ? `${this.proxy}${this.proxyport && `:${this.proxyport}`}` : this.proxyImplicit

    window.localStorage.setItem('username', this.username)
    window.localStorage.setItem('password', this.password)
    window.localStorage.setItem('server', server)
    window.localStorage.setItem('proxy', proxy)
    window.localStorage.setItem('version', this.version)

    this.dispatchEvent(new window.CustomEvent('connect', {
      detail: {
        server,
        proxy,
        username: this.username,
        password: this.password,
        botVersion: this.version
      }
    }))
  }
}

window.customElements.define('pmui-playscreen', PlayScreen)
