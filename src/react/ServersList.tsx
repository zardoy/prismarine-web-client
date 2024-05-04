import React from 'react'
import { useAutocomplete } from '@mui/base'
import { omitObj } from '@zardoy/utils'
import Singleplayer from './Singleplayer'
import Input from './Input'
import Button from './Button'
import PixelartIcon from './PixelartIcon'

interface Props extends React.ComponentProps<typeof Singleplayer> {
  joinServer: (ip: string, overrides: {
    username?: string
    password?: string
    proxy?: string
    version?: string
    shouldSave?: boolean
  }) => void
  initialProxies: SavedProxiesLocalStorage
  updateProxies: (proxies: SavedProxiesLocalStorage) => void
  username: string
  setUsername: (username: string) => void
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

export default ({ initialProxies, updateProxies: updateProxiesProp, joinServer, username, setUsername, ...props }: Props) => {
  const [proxies, setProxies] = React.useState(initialProxies)

  const updateProxies = (newData: SavedProxiesLocalStorage) => {
    setProxies(newData)
    updateProxiesProp(newData)
  }

  const autocomplete = useAutocomplete({
    value: proxies.selected,
    options: proxies.proxies.filter(proxy => proxy !== proxies.selected),
    onInputChange (event, value, reason) {
      // console.log('onChange', { event, value, reason, details })
      if (value) {
        updateProxies({
          ...proxies,
          selected: value
        })
      }
    },
    freeSolo: true
  })

  const [serverIp, setServerIp] = React.useState('')
  const [save, setSave] = React.useState(true)

  return <Singleplayer {...props}
    firstRowChildrenOverride={<form style={{ width: '100%', display: 'flex', justifyContent: 'center' }} onSubmit={(e) => {
      e.preventDefault()
      joinServer(serverIp, {
        shouldSave: save,
      })
    }}
    >
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {/* todo history */}
        <Input required placeholder='Quick Connect IP' value={serverIp} onChange={({ target: { value } }) => setServerIp(value)} />
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
          <div {...autocomplete.getRootProps()} style={{ position: 'relative', width: 130 }}>
            <ProxyRender
              {...omitObj(autocomplete.getInputProps(), 'ref')}
              inputRef={autocomplete.getInputProps().ref as any}
              status='unknown'
              ip=''
            />
            {autocomplete.groupedOptions && <ul {...autocomplete.getListboxProps()} style={{
              position: 'absolute',
              zIndex: 1,
              // marginTop: 10,
            }}>
              {autocomplete.groupedOptions.map((proxy, index) => {
                const { itemRef, ...optionProps } = autocomplete.getOptionProps({ option: proxy, index })
                return <ProxyRender {...optionProps as any} ip={proxy} disabled />
              })}
            </ul>}
          </div>
          <PixelartIcon iconName='user' styles={{ fontSize: 14, color: 'lightgray', marginLeft: 2 }} />
          <Input rootStyles={{ width: 80 }} value={username} onChange={({ target: { value } }) => setUsername(value)} />
        </div>
      </div>
    }
    serversLayout
    onWorldAction={(action, serverName) => {
      if (action === 'load') {
        joinServer(serverName, {})
      }
      props.onWorldAction?.(action, serverName)
    }}
  />
}

type Status = 'unknown' | 'error' | 'success'

const ProxyRender = ({ status, ip, inputRef, value, setValue, ...props }: {
  status: Status
  ip: string
} & Record<string, any>) => {
  const iconPerStatus = {
    unknown: 'cellular-signal-0',
    error: 'cellular-signal-off',
    success: 'cellular-signal-3',
  }

  return <div style={{
    position: 'relative',
  }} {...props}>
    <Input
      inputRef={inputRef}
      style={{
        paddingLeft: 16,
      }}
      rootStyles={{
        width: '100%',
      }}
      value={value}
      // onChange={({ target: { value } }) => setValue?.(value)}
      onChange={props.onChange}
    />
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 2
    }}>
      <PixelartIcon iconName={iconPerStatus.unknown} />
      <div style={{
        fontSize: 10,
        // color: 'lightgray',
        // ellipsis
        width: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {ip}
      </div>
    </div>
  </div>
}
