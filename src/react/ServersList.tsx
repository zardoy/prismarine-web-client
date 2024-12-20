import React from 'react'
import Singleplayer from './Singleplayer'
import Input from './Input'
import Button from './Button'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'
import Select from './Select'
import { BaseServerInfo } from './AddServerOrConnect'
import { useIsSmallWidth } from './simpleHooks'

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
  setQuickConnectIp?: (ip: string) => void
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

export default ({ initialProxies, updateProxies: updateProxiesProp, joinServer, username, setUsername, onProfileClick, setQuickConnectIp, ...props }: Props) => {
  const [proxies, setProxies] = React.useState(initialProxies)

  const updateProxies = (newData: SavedProxiesLocalStorage) => {
    setProxies(newData)
    updateProxiesProp(newData)
  }

  const [serverIp, setServerIp] = React.useState('')
  const [save, setSave] = React.useState(true)
  const [activeHighlight, setActiveHighlight] = React.useState(undefined as 'quick-connect' | 'server-list' | undefined)

  const getActiveHighlightStyles = (type: typeof activeHighlight) => {
    const styles: React.CSSProperties = {
      transition: 'filter 0.2s',
    }
    if (activeHighlight && activeHighlight !== type) {
      styles.filter = 'brightness(0.7)'
    }
    return styles
  }

  const isSmallWidth = useIsSmallWidth()

  return <Singleplayer
    {...props}
    firstRowChildrenOverride={<form
      style={{ width: '100%', display: 'flex', justifyContent: 'center' }} onSubmit={(e) => {
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
      <div
        style={{ display: 'flex', gap: 5, alignItems: 'center', ...getActiveHighlightStyles('quick-connect') }}
        className='quick-connect-row'
        onMouseEnter={() => setActiveHighlight('quick-connect')}
        onMouseLeave={() => setActiveHighlight(undefined)}
      >
        {/* todo history */}
        <Input
          required
          placeholder='Quick Connect IP (:version)'
          value={serverIp}
          onChange={({ target: { value } }) => {
            setQuickConnectIp?.(value)
            setServerIp(value)
          }}
          width={isSmallWidth ? 120 : 180}
        />
        <label style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 5, height: '100%', marginTop: '-1px' }}>
          <input
            type='checkbox' checked={save}
            style={{ borderRadius: 0 }}
            onChange={({ target: { checked } }) => setSave(checked)}
          /> Save
        </label>
        <Button style={{ width: 90 }} type='submit'>Connect</Button>
      </div>
    </form>}
    searchRowChildrenOverride={
      <div style={{
        // marginTop: 12,
      }}
      >
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {isSmallWidth
            ? <PixelartIcon iconName={pixelartIcons.server} styles={{ fontSize: 14, color: 'lightgray', marginLeft: 2 }} onClick={onProfileClick} />
            : <span style={{ color: 'lightgray', fontSize: 14 }}>Proxy:</span>}
          <Select
            initialOptions={proxies.proxies.map(p => { return { value: p, label: p } })}
            defaultValue={{ value: proxies.selected, label: proxies.selected }}
            updateOptions={(newSel) => {
              updateProxies({ proxies: [...proxies.proxies], selected: newSel })
            }}
            containerStyle={{
              width: isSmallWidth ? 140 : 180,
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
    setListHovered={(hovered) => {
      setActiveHighlight(hovered ? 'server-list' : undefined)
    }}
    listStyle={getActiveHighlightStyles('server-list')}
    secondRowStyles={getActiveHighlightStyles('server-list')}
  />
}
