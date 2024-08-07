import React from 'react'
import Singleplayer from './Singleplayer'
import Input from './Input'
import Button from './Button'
import PixelartIcon from './PixelartIcon'
import Select from './Select'
import { BaseServerInfo } from './AddServerOrConnect'

interface Props extends React.ComponentProps<typeof Singleplayer> {
  joinServer: (info: BaseServerInfo, additional: {
    shouldSave?: boolean
    index?: number
  }) => void
  initialProxies: SavedProxiesLocalStorage
  updateProxies: (proxies: SavedProxiesLocalStorage) => void
  username: string
  setUsername: (username: string) => void
  onProfileClick?: () => void
}

export interface SavedProxiesLocalStorage {
  proxies: readonly string[]
  selected: string
}

type ProxyStatusResult = {
  time: number
  ping: number
  status: 'success' | 'error' | 'unknown'
}

export default ({ initialProxies, updateProxies: updateProxiesProp, joinServer, username, setUsername, onProfileClick, ...props }: Props) => {
  const [proxies, setProxies] = React.useState(initialProxies)

  const updateProxies = (newData: SavedProxiesLocalStorage) => {
    setProxies(newData)
    updateProxiesProp(newData)
  }

  const [serverIp, setServerIp] = React.useState('')
  const [save, setSave] = React.useState(true)

  return <Singleplayer {...props}
    firstRowChildrenOverride={<form style={{ width: '100%', display: 'flex', justifyContent: 'center' }} onSubmit={(e) => {
      e.preventDefault()
      let ip = serverIp
      let version
      let msAuth = false
      const parts = ip.split(':')
      if (parts.at(-1) === 'ms') {
        msAuth = true
        parts.pop()
      }
      if (parts.length > 1 && parts.at(-1)!.includes('.')) {
        version = parts.at(-1)!
        ip = parts.slice(0, -1).join(':')
      }
      joinServer({
        ip,
        versionOverride: version,
        authenticatedAccountOverride: msAuth ? true : undefined, // todo popup selector
      }, {
        shouldSave: save,
      })
    }}
    >
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {/* todo history */}
        <Input required placeholder='Quick Connect IP (:version)' value={serverIp} onChange={({ target: { value } }) => setServerIp(value)} />
        <label style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 5, height: '100%', marginTop: '-1px' }}>
          <input type='checkbox' checked={save}
            style={{ borderRadius: 0 }}
            onChange={({ target: { checked } }) => setSave(checked)}
          /> Save</label>
        <Button style={{ width: 90 }} type='submit'>Join Server</Button>
      </div>
    </form>}
    searchRowChildrenOverride={
      <div style={{
        // marginTop: 12,
      }}>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <span style={{ color: 'lightgray', fontSize: 14 }}>Proxy:</span>
          <Select
            initialOptions={{
              options: [...proxies.proxies],
              selected: proxies.selected
            }}
            updateOptions={(options) => {
              updateProxies({ proxies: [...options.options], selected: options.selected })
            }}

          />
          <PixelartIcon iconName='user' styles={{ fontSize: 14, color: 'lightgray', marginLeft: 2 }} onClick={onProfileClick} />
          <Input rootStyles={{ width: 80 }} value={username} onChange={({ target: { value } }) => setUsername(value)} />
        </div>
      </div>
    }
    serversLayout
    onWorldAction={(action, serverName) => {
      if (action === 'load') {
        joinServer({
          ip: serverName,
        }, {})
      }
      props.onWorldAction?.(action, serverName)
    }}
  />
}


