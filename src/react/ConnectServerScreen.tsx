import { useEffect, useState } from 'react'
import { proxy } from 'valtio'
import { miscUiState, showModal } from '../globalState'
import Screen from './Screen'
import { useIsModalActive } from './utils'

const formProxy = proxy({
  username: window.localStorage.getItem('username') || '',
  password: window.localStorage.getItem('password') || '',
  server: window.localStorage.getItem('server') || '',
  proxy: window.localStorage.getItem('proxy') || '',
  version: window.localStorage.getItem('version') || ''
})

export default () => {
  const isModalActive = useIsModalActive('join-server')

  useEffect(() => {
    void window.fetch('config.json').then(async res => res.json()).then(c => c, (error) => {
      console.warn('Failed to load optional app config.json', error)
      return {}
    }).then(async (/** @type {import('../globalState').AppConfig} */config) => {
      miscUiState.appConfig = config
      const params = new URLSearchParams(window.location.search)

      const getParam = (localStorageKey, qs = localStorageKey) => {
        const qsValue = qs ? params.get(qs) : undefined
        if (qsValue) {
          showModal({ reactType: 'join-server' })
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
      this.username = getParam('username') || 'mviewer' + (Math.floor(Math.random() * 1000))
      this.password = getParam('password') || ''
      if (process.env.NODE_ENV === 'development' && params.get('reconnect') && this.server && this.username) {
        this.onConnectPress()
      }
    })
  }, [])

  return isModalActive ? <Inner /> : null
}

const Inner = () => {
  const connect = () => {
    const server = this.server ? `${this.server}${this.serverport && `:${this.serverport}`}` : this.serverImplicit
    const proxy = this.proxy ? `${this.proxy}${this.proxyport && `:${this.proxyport}`}` : this.proxyImplicit

    window.localStorage.setItem('username', this.username)
    window.localStorage.setItem('password', this.password)
    window.localStorage.setItem('server', server)
    window.localStorage.setItem('proxy', proxy)
    window.localStorage.setItem('version', this.version)

    window.dispatchEvent(new window.CustomEvent('connect', {
      detail: {
        server,
        proxy,
        username: this.username,
        password: this.password,
        botVersion: this.version
      }
    }))
  }

  return <Screen title='Join a Server' backdrop></Screen>
}
