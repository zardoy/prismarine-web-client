import { useEffect, useMemo, useState } from 'react'
import { proxy } from 'valtio'
import { qsOptions } from '../optionsStorage'
import { ConnectOptions } from '../connect'
import { hideCurrentModal, miscUiState, showModal } from '../globalState'
import ServersList from './ServersList'
import AddServer from './AddServer'
import { useDidUpdateEffect } from './utils'
import { useIsModalActive } from './utilsApp'

interface StoreServerItem {
  ip: string,
  name?: string
  version?: string
  lastJoined?: number
  description?: string
  proxyOverride?: string
  usernameOverride?: string
  passwordOverride?: string
  optionsOverride?: Record<string, any>
  autoLogin?: Record<string, string>
}

type ServerResponse = {
  version: {
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
  icon: string
  motd: {
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
      passwordOverride: localStorage['password'],
      version: localStorage['version'],
      lastJoined: Date.now()
    }
    servers.push(legacyLastJoinedServer)
  }

  if (servers.length === 0) { // server list is empty, let's suggest some
    for (const server of miscUiState.appConfig?.promoteServers ?? []) {
      servers.push({
        ip: server.ip,
        description: server.description,
        version: server.version,
      })
    }
  }

  return servers
}

const setNewServersList = (serversList: StoreServerItem[]) => {
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

export const updateLoadedServerData = (callback: (data: StoreServerItem) => StoreServerItem) => {
  // function assumes component is not mounted to avoid sync issues after save
  const { loadedServerIndex } = miscUiState
  if (!loadedServerIndex) return
  const servers = getInitialServersList()
  const server = servers[loadedServerIndex]
  servers[loadedServerIndex] = callback(server)
  setNewServersList(servers)
}

const Inner = () => {
  const [proxies, setProxies] = useState<readonly string[]>(localStorage['proxies'] ? JSON.parse(localStorage['proxies']) : getInitialProxies())
  const [selectedProxy, setSelectedProxy] = useState(localStorage.getItem('selectedProxy') ?? proxies?.[0] ?? '')
  const [serverEditScreen, setServerEditScreen] = useState<StoreServerItem | true | null>(null) // true for add
  const [defaultUsername, setDefaultUsername] = useState(localStorage['username'] ?? (`mcrafter${Math.floor(Math.random() * 1000)}`))

  useEffect(() => {
    localStorage.setItem('username', defaultUsername)
  }, [defaultUsername])

  useEffect(() => {
    // TODO! do not unmount on connecting screen
    // if (proxies.length) {
    //   localStorage.setItem('proxies', JSON.stringify(proxies))
    // }
    // if (selectedProxy) {
    //   localStorage.setItem('selectedProxy', selectedProxy)
    // }
  }, [proxies])

  const [serversList, setServersList] = useState<StoreServerItem[]>(() => getInitialServersList())
  const [additionalData, setAdditionalData] = useState<Record<string, AdditionalDisplayData>>({})

  useDidUpdateEffect(() => {
    // save data only on user changes
    setNewServersList(serversList)
  }, [serversList])

  // by lastJoined
  const serversListSorted = useMemo(() => {
    return serversList.map((server, index) => ({ ...server, index })).sort((a, b) => (b.lastJoined ?? 0) - (a.lastJoined ?? 0))
  }, [serversList])

  useEffect(() => {
    const update = async () => {
      for (const server of serversListSorted) {
        const isInLocalNetwork = server.ip.startsWith('192.168.') || server.ip.startsWith('10.') || server.ip.startsWith('172.') || server.ip.startsWith('127.') || server.ip.startsWith('localhost')
        if (isInLocalNetwork) continue
        // eslint-disable-next-line no-await-in-loop
        await fetch(`https://api.mcstatus.io/v2/status/java/${server.ip}`).then(async r => r.json()).then((data: ServerResponse) => {
          const versionClean = data.version.name_raw.replace(/^[^\d.]+/, '')
          setAdditionalData(old => {
            return ({
              ...old,
              [server.ip]: {
                formattedText: data.motd.raw,
                textNameRight: `${versionClean} ${data.players?.online ?? '??'}/${data.players?.max ?? '??'}`,
                icon: data.icon,
              }
            })
          })
        })
      }
    }
    void update()
  }, [serversListSorted])

  const isEditScreenModal = useIsModalActive('editServer')

  useEffect(() => {
    if (!isEditScreenModal) {
      setServerEditScreen(null)
    }
  }, [isEditScreenModal])

  useEffect(() => {
    if (serverEditScreen && !isEditScreenModal) {
      showModal({ reactType: 'editServer' })
    }
  }, [serverEditScreen])

  if (isEditScreenModal) {
    return <AddServer
      defaults={{
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
          serversList[index] = info
          setServersList([...serversList])
        }
        setServerEditScreen(null)
      }}
      initialData={!serverEditScreen || serverEditScreen === true ? undefined : serverEditScreen}
      onQsConnect={(info) => {
        const connectOptions: ConnectOptions = {
          username: info.usernameOverride || defaultUsername,
          server: info.ip,
          proxy: info.proxyOverride || selectedProxy,
          botVersion: info.versionOverride,
          password: info.passwordOverride,
          ignoreQs: true,
        }
        dispatchEvent(new CustomEvent('connect', { detail: connectOptions }))
      }}
    />
  }

  return <ServersList
    joinServer={(indexOrIp, overrides) => {
      let ip = indexOrIp
      let server: StoreServerItem | undefined
      if (overrides.shouldSave === undefined) {
        // hack: inner component doesn't know of overrides for existing servers
        server = serversListSorted.find(s => s.index.toString() === indexOrIp)!
        ip = server.ip
        overrides = server
      }

      const lastJoinedUsername = serversListSorted.find(s => s.usernameOverride)?.usernameOverride
      let username = overrides.username || defaultUsername
      if (!username) {
        username = prompt('Username', lastJoinedUsername || '')
        if (!username) return
        setDefaultUsername(username)
      }
      const options = {
        username,
        server: ip,
        proxy: overrides.proxy || selectedProxy,
        botVersion: overrides.version,
        password: overrides.password,
        ignoreQs: true,
        autoLoginPassword: server?.autoLogin?.[username],
        onSuccessfulPlay () {
          if (overrides.shouldSave && !serversList.some(s => s.ip === ip)) {
            const newServersList = [...serversList, {
              ip,
              lastJoined: Date.now(),
            }]
            // setServersList(newServersList)
            setNewServersList(newServersList) // component is not mounted
          }

          if (overrides.shouldSave === undefined) { // loading saved
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
          if (selectedProxy) {
            localStorage.setItem('selectedProxy', selectedProxy)
          }
        },
        serverIndex: overrides.shouldSave ? serversList.length.toString() : indexOrIp // assume last
      } satisfies ConnectOptions
      dispatchEvent(new CustomEvent('connect', { detail: options }))
      // qsOptions
    }}
    username={defaultUsername}
    setUsername={setDefaultUsername}
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
        detail: (server.version ?? '') + ' ' + (server.usernameOverride ?? ''),
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
  />
}

export default () => {
  const editServerModalActive = useIsModalActive('editServer')
  const isServersListModalActive = useIsModalActive('serversList')
  const eitherModal = isServersListModalActive || editServerModalActive
  return eitherModal ? <Inner /> : null
}
