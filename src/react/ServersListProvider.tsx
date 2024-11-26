import { useEffect, useMemo, useState } from 'react'
import { useUtilsEffect } from '@zardoy/react-util'
import { useSnapshot } from 'valtio'
import { ConnectOptions } from '../connect'
import { activeModalStack, hideCurrentModal, miscUiState, showModal } from '../globalState'
import supportedVersions from '../supportedVersions.mjs'
import ServersList from './ServersList'
import AddServerOrConnect, { BaseServerInfo } from './AddServerOrConnect'
import { useDidUpdateEffect } from './utils'
import { useIsModalActive } from './utilsApp'
import { showOptionsModal } from './SelectOption'
import { useCopyKeybinding } from './simpleHooks'

interface StoreServerItem extends BaseServerInfo {
  lastJoined?: number
  description?: string
  optionsOverride?: Record<string, any>
  autoLogin?: Record<string, string>
}

type ServerResponse = {
  online: boolean
  version?: {
    name_raw: string
  }
  // display tooltip
  players?: {
    online: number
    max: number
    list: Array<{
      name_raw: string
      name_clean: string
    }>
  }
  icon?: string
  motd?: {
    raw: string
  }
  // todo circle error icon
  mods?: Array<{ name, version }>
  // todo display via hammer icon
  software?: string
  plugins?: Array<{ name, version }>
}

type AdditionalDisplayData = {
  formattedText: string
  textNameRight: string
  icon?: string
}

export interface AuthenticatedAccount {
  // type: 'microsoft'
  username: string
  cachedTokens?: {
    data: any
    expiresOn: number
  }
}

const getInitialServersList = () => {
  if (localStorage['serversList']) return JSON.parse(localStorage['serversList']) as StoreServerItem[]

  const servers = [] as StoreServerItem[]

  const legacyServersList = localStorage['serverHistory'] ? JSON.parse(localStorage['serverHistory']) as string[] : null
  if (legacyServersList) {
    for (const server of legacyServersList) {
      if (!server || localStorage['server'] === server) continue
      servers.push({ ip: server, lastJoined: Date.now() })
    }
  }

  if (localStorage['server']) {
    const legacyLastJoinedServer: StoreServerItem = {
      ip: localStorage['server'],
      versionOverride: localStorage['version'],
      lastJoined: Date.now()
    }
    servers.push(legacyLastJoinedServer)
  }

  if (servers.length === 0) { // server list is empty, let's suggest some
    for (const server of miscUiState.appConfig?.promoteServers ?? []) {
      servers.push({
        ip: server.ip,
        description: server.description,
        versionOverride: server.version,
      })
    }
  }

  return servers
}

const serversListQs = new URLSearchParams(window.location.search).get('serversList')
const proxyQs = new URLSearchParams(window.location.search).get('proxy')

const setNewServersList = (serversList: StoreServerItem[], force = false) => {
  if (serversListQs && !force) return
  localStorage['serversList'] = JSON.stringify(serversList)

  // cleanup legacy
  localStorage.removeItem('serverHistory')
  localStorage.removeItem('server')
  localStorage.removeItem('password')
  localStorage.removeItem('version')
}

const getInitialProxies = () => {
  const proxies = [] as string[]
  if (miscUiState.appConfig?.defaultProxy) {
    proxies.push(miscUiState.appConfig.defaultProxy)
  }
  if (localStorage['proxy']) {
    proxies.push(localStorage['proxy'])
    localStorage.removeItem('proxy')
  }
  return proxies
}

export const updateLoadedServerData = (callback: (data: StoreServerItem) => StoreServerItem, index = miscUiState.loadedServerIndex) => {
  if (!index) index = miscUiState.loadedServerIndex
  if (!index) return
  // function assumes component is not mounted to avoid sync issues after save
  const servers = getInitialServersList()
  const server = servers[index]
  servers[index] = callback(server)
  setNewServersList(servers)
}

export const updateAuthenticatedAccountData = (callback: (data: AuthenticatedAccount[]) => AuthenticatedAccount[]) => {
  const accounts = JSON.parse(localStorage['authenticatedAccounts'] || '[]') as AuthenticatedAccount[]
  const newAccounts = callback(accounts)
  localStorage['authenticatedAccounts'] = JSON.stringify(newAccounts)
}

// todo move to base
const normalizeIp = (ip: string) => ip.replace(/https?:\/\//, '').replace(/\/(:|$)/, '')

const Inner = ({ hidden, customServersList }: { hidden?: boolean, customServersList?: string[] }) => {
  const [proxies, setProxies] = useState<readonly string[]>(localStorage['proxies'] ? JSON.parse(localStorage['proxies']) : getInitialProxies())
  const [selectedProxy, setSelectedProxy] = useState(proxyQs ?? localStorage.getItem('selectedProxy') ?? proxies?.[0] ?? '')
  const [serverEditScreen, setServerEditScreen] = useState<StoreServerItem | true | null>(null) // true for add
  const [defaultUsername, _setDefaultUsername] = useState(localStorage['username'] ?? (`mcrafter${Math.floor(Math.random() * 1000)}`))
  const [authenticatedAccounts, _setAuthenticatedAccounts] = useState<AuthenticatedAccount[]>(JSON.parse(localStorage['authenticatedAccounts'] || '[]'))
  const [quickConnectIp, setQuickConnectIp] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const setAuthenticatedAccounts = (newState: typeof authenticatedAccounts) => {
    _setAuthenticatedAccounts(newState)
    localStorage.setItem('authenticatedAccounts', JSON.stringify(newState))
  }

  const setDefaultUsername = (newState: typeof defaultUsername) => {
    _setDefaultUsername(newState)
    localStorage.setItem('username', newState)
  }

  const saveNewProxy = () => {
    if (!selectedProxy || proxyQs) return
    localStorage.setItem('selectedProxy', selectedProxy)
  }

  useEffect(() => {
    if (proxies.length) {
      localStorage.setItem('proxies', JSON.stringify(proxies))
    }
    saveNewProxy()
  }, [proxies])

  const [serversList, setServersList] = useState<StoreServerItem[]>(() => (customServersList ? [] : getInitialServersList()))
  const [additionalData, setAdditionalData] = useState<Record<string, AdditionalDisplayData>>({})

  useEffect(() => {
    if (customServersList) {
      setServersList(customServersList.map(row => {
        const [ip, name] = row.split(' ')
        const [_ip, _port, version] = ip.split(':')
        return {
          ip,
          versionOverride: version,
          name,
        }
      }))
    }
  }, [customServersList])

  useDidUpdateEffect(() => {
    // save data only on user changes
    setNewServersList(serversList)
  }, [serversList])

  // by lastJoined
  const serversListSorted = useMemo(() => {
    return serversList.map((server, index) => ({ ...server, index })).sort((a, b) => (b.lastJoined ?? 0) - (a.lastJoined ?? 0))
  }, [serversList])

  useUtilsEffect(({ signal }) => {
    const update = async () => {
      for (const server of serversListSorted) {
        const isInLocalNetwork = server.ip.startsWith('192.168.') || server.ip.startsWith('10.') || server.ip.startsWith('172.') || server.ip.startsWith('127.') || server.ip.startsWith('localhost')
        if (isInLocalNetwork || signal.aborted) continue
        // eslint-disable-next-line no-await-in-loop
        await fetch(`https://api.mcstatus.io/v2/status/java/${server.ip}`, {
          // TODO: bounty for this who fix it
          // signal
        }).then(async r => r.json()).then((data: ServerResponse) => {
          const versionClean = data.version?.name_raw.replace(/^[^\d.]+/, '')
          if (!versionClean) return
          setAdditionalData(old => {
            return ({
              ...old,
              [server.ip]: {
                formattedText: data.motd?.raw ?? '',
                textNameRight: `${versionClean} ${data.players?.online ?? '??'}/${data.players?.max ?? '??'}`,
                icon: data.icon,
              }
            })
          })
        })
      }
    }
    void update().catch((err) => {})
  }, [serversListSorted])

  const isEditScreenModal = useIsModalActive('editServer')

  useDidUpdateEffect(() => {
    if (serverEditScreen && !isEditScreenModal) {
      showModal({ reactType: 'editServer' })
    }
    if (!serverEditScreen && isEditScreenModal) {
      hideCurrentModal()
    }
  }, [serverEditScreen])

  useDidUpdateEffect(() => {
    if (!isEditScreenModal) {
      setServerEditScreen(null)
    }
  }, [isEditScreenModal])

  useCopyKeybinding(() => {
    const item = serversList[selectedIndex]
    if (!item) return
    let str = `${item.ip}`
    if (item.versionOverride) {
      str += `:${item.versionOverride}`
    }
    return str
  })

  const editModalJsx = isEditScreenModal ? <AddServerOrConnect
    placeholders={{
      proxyOverride: selectedProxy,
      usernameOverride: defaultUsername,
    }}
    parseQs={!serverEditScreen}
    onBack={() => {
      hideCurrentModal()
    }}
    onConfirm={(info) => {
      if (!serverEditScreen) return
      if (serverEditScreen === true) {
        const server: StoreServerItem = { ...info, lastJoined: Date.now() } // so it appears first
        setServersList(old => [...old, server])
      } else {
        const index = serversList.indexOf(serverEditScreen)
        const { lastJoined } = serversList[index]
        serversList[index] = { ...info, lastJoined }
        setServersList([...serversList])
      }
      setServerEditScreen(null)
    }}
    accounts={authenticatedAccounts.map(a => a.username)}
    initialData={!serverEditScreen || serverEditScreen === true ? {
      ip: quickConnectIp
    } : serverEditScreen}
    onQsConnect={(info) => {
      const connectOptions: ConnectOptions = {
        username: info.usernameOverride || defaultUsername,
        server: normalizeIp(info.ip),
        proxy: info.proxyOverride || selectedProxy,
        botVersion: info.versionOverride,
        ignoreQs: true,
      }
      dispatchEvent(new CustomEvent('connect', { detail: connectOptions }))
    }}
    versions={supportedVersions}
  /> : null

  const serversListJsx = <ServersList
    joinServer={(overrides, { shouldSave }) => {
      const indexOrIp = overrides.ip
      let ip = indexOrIp
      let server: StoreServerItem | undefined
      if (shouldSave === undefined) {
        // hack: inner component doesn't know of overrides for existing servers
        server = serversListSorted.find(s => s.index.toString() === indexOrIp)!
        ip = server.ip
        overrides = server
      }

      const lastJoinedUsername = serversListSorted.find(s => s.usernameOverride)?.usernameOverride
      let username = overrides.usernameOverride || defaultUsername
      if (!username) {
        username = prompt('Username', lastJoinedUsername || '')
        if (!username) return
        setDefaultUsername(username)
      }
      let authenticatedAccount: AuthenticatedAccount | true | undefined
      if (overrides.authenticatedAccountOverride) {
        if (overrides.authenticatedAccountOverride === true) {
          authenticatedAccount = true
        } else {
          authenticatedAccount = authenticatedAccounts.find(a => a.username === overrides.authenticatedAccountOverride) ?? true
        }
      }
      const options = {
        username,
        server: normalizeIp(ip),
        proxy: overrides.proxyOverride || selectedProxy,
        botVersion: overrides.versionOverride ?? /* legacy */ overrides['version'],
        ignoreQs: true,
        autoLoginPassword: server?.autoLogin?.[username],
        authenticatedAccount,
        onSuccessfulPlay () {
          if (shouldSave && !serversList.some(s => s.ip === ip)) {
            const newServersList: StoreServerItem[] = [...serversList, {
              ip,
              lastJoined: Date.now(),
              versionOverride: overrides.versionOverride,
            }]
            // setServersList(newServersList)
            setNewServersList(newServersList) // component is not mounted
            miscUiState.loadedServerIndex = (newServersList.length - 1).toString()
          }

          if (shouldSave === undefined) { // loading saved
            // find and update
            const server = serversList.find(s => s.ip === ip)
            if (server) {
              server.lastJoined = Date.now()
              // setServersList([...serversList])
              setNewServersList(serversList) // component is not mounted
            }
          }

          // save new selected proxy (if new)
          if (!proxies.includes(selectedProxy)) {
            // setProxies([...proxies, selectedProxy])
            localStorage.setItem('proxies', JSON.stringify([...proxies, selectedProxy]))
          }
          saveNewProxy()
        },
        serverIndex: shouldSave ? serversList.length.toString() : indexOrIp // assume last
      } satisfies ConnectOptions
      dispatchEvent(new CustomEvent('connect', { detail: options }))
      // qsOptions
    }}
    lockedEditing={!!customServersList}
    username={defaultUsername}
    setUsername={setDefaultUsername}
    setQuickConnectIp={setQuickConnectIp}
    onProfileClick={async () => {
      const username = await showOptionsModal('Select authenticated account to remove', authenticatedAccounts.map(a => a.username))
      if (!username) return
      setAuthenticatedAccounts(authenticatedAccounts.filter(a => a.username !== username))
    }}
    onWorldAction={(action, index) => {
      const server = serversList[index]
      if (!server) return

      if (action === 'edit') {
        setServerEditScreen(server)
      }
      if (action === 'delete') {
        setServersList(old => old.filter(s => s !== server))
      }
    }}
    onGeneralAction={(action) => {
      if (action === 'create') {
        setServerEditScreen(true)
      }
      if (action === 'cancel') {
        hideCurrentModal()
      }
    }}
    worldData={serversListSorted.map(server => {
      const additional = additionalData[server.ip]
      return {
        name: server.index.toString(),
        title: server.name || server.ip,
        detail: (server.versionOverride ?? '') + ' ' + (server.usernameOverride ?? ''),
        // lastPlayed: server.lastJoined,
        formattedTextOverride: additional?.formattedText,
        worldNameRight: additional?.textNameRight ?? '',
        iconSrc: additional?.icon,
      }
    })}
    initialProxies={{
      proxies,
      selected: selectedProxy,
    }}
    updateProxies={({ proxies, selected }) => {
      // new proxy is saved in joinServer
      setProxies(proxies)
      setSelectedProxy(selected)
    }}
    hidden={hidden}
    onRowSelect={(_, i) => {
      setSelectedIndex(i)
    }}
  />
  return <>
    {serversListJsx}
    {editModalJsx}
  </>
}

export default () => {
  const [customServersList, setCustomServersList] = useState<string[] | undefined>(serversListQs ? [] : undefined)

  useEffect(() => {
    if (serversListQs) {
      if (serversListQs.startsWith('http')) {
        void fetch(serversListQs).then(async r => r.text()).then((text) => {
          const isJson = serversListQs.endsWith('.json') ? true : serversListQs.endsWith('.txt') ? false : text.startsWith('[')
          setCustomServersList(isJson ? JSON.parse(text) : text.split('\n').map(x => x.trim()).filter(x => x.trim().length > 0))
        }).catch((err) => {
          console.error(err)
          alert(`Failed to get servers list file: ${err}`)
        })
      } else {
        setCustomServersList(serversListQs.split(','))
      }
    }
  }, [])

  const modalStack = useSnapshot(activeModalStack)
  const hasServersListModal = modalStack.some(x => x.reactType === 'serversList')
  const editServerModalActive = useIsModalActive('editServer')
  const isServersListModalActive = useIsModalActive('serversList')

  const eitherModal = isServersListModalActive || editServerModalActive
  const render = eitherModal || hasServersListModal
  return render ? <Inner hidden={!isServersListModalActive} customServersList={customServersList} /> : null
}
