import React from 'react'
import Screen from './Screen'
import Input from './Input'
import Button from './Button'
import { useIsSmallWidth } from './simpleHooks'

export interface BaseServerInfo {
  ip: string
  name?: string
  versionOverride?: string
  proxyOverride?: string
  usernameOverride?: string
  passwordOverride?: string
}

interface Props {
  onBack: () => void
  onConfirm: (info: BaseServerInfo) => void
  title?: string
  initialData?: BaseServerInfo
  parseQs?: boolean
  onQsConnect?: (server: BaseServerInfo) => void
  defaults?: Pick<BaseServerInfo, 'proxyOverride' | 'usernameOverride'>
}

export default ({ onBack, onConfirm, title = 'Add a Server', initialData, parseQs, onQsConnect, defaults }: Props) => {
  const qsParams = parseQs ? new URLSearchParams(window.location.search) : undefined

  const [serverName, setServerName] = React.useState(initialData?.name ?? qsParams?.get('name') ?? '')

  const ipWithoutPort = initialData?.ip.split(':')[0]
  const port = initialData?.ip.split(':')[1]

  const [serverIp, setServerIp] = React.useState(ipWithoutPort ?? qsParams?.get('ip') ?? '')
  const [serverPort, setServerPort] = React.useState(port ?? '')
  const [versionOverride, setVersionOverride] = React.useState(initialData?.versionOverride ?? /* legacy */ initialData?.['version'] ?? qsParams?.get('version') ?? '')
  const [proxyOverride, setProxyOverride] = React.useState(initialData?.proxyOverride ?? qsParams?.get('proxy') ?? '')
  const [usernameOverride, setUsernameOverride] = React.useState(initialData?.usernameOverride ?? qsParams?.get('username') ?? '')
  const [passwordOverride, setPasswordOverride] = React.useState(initialData?.passwordOverride ?? qsParams?.get('password') ?? '')
  const smallWidth = useIsSmallWidth()
  const lockConnect = qsParams?.get('lockConnect') === 'true'

  return <Screen title={qsParams?.get('ip') ? 'Connect to Server' : title} backdrop>
    <form style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}
    onSubmit={(e) => {
      e.preventDefault()
      let ip = serverIp.includes(':') ? serverIp : `${serverIp}:${serverPort}`
      ip = ip.replace(/:$/, '')
      onConfirm({
        name: serverName,
        ip,
        versionOverride,
        proxyOverride,
        usernameOverride,
        passwordOverride
      })
    }}
    >
      <div style={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: smallWidth ? '1fr' : '1fr 1fr'
      }}>
        <div style={{ gridColumn: smallWidth ? '' : 'span 2', display: 'flex', justifyContent: 'center' }}>
          <InputWithLabel label="Server Name" value={serverName} onChange={({ target: { value } }) => setServerName(value)} placeholder='Defaults to IP' />
        </div>
        <InputWithLabel required label="Server IP" value={serverIp} onChange={({ target: { value } }) => setServerIp(value)} />
        <InputWithLabel label="Server Port" value={serverPort} onChange={({ target: { value } }) => setServerPort(value)} placeholder='25565' />
        <div style={{ gridColumn: smallWidth ? '' : 'span 2' }}>Overrides:</div>
        <InputWithLabel label="Version Override" value={versionOverride} onChange={({ target: { value } }) => setVersionOverride(value)} placeholder='Optional, but recommended to specify' />
        <InputWithLabel label="Proxy Override" value={proxyOverride} onChange={({ target: { value } }) => setProxyOverride(value)} placeholder={defaults?.proxyOverride} />
        <InputWithLabel label="Username Override" value={usernameOverride} onChange={({ target: { value } }) => setUsernameOverride(value)} placeholder={defaults?.usernameOverride} />
        <InputWithLabel label="Password Override" value={passwordOverride} onChange={({ target: { value } }) => setPasswordOverride(value)} /* placeholder='For advanced usage only' */ />
        {!lockConnect && <><Button onClick={() => {
          onBack()
        } }>Cancel</Button><Button type='submit'>Save</Button></>}
        {qsParams?.get('ip') && <div style={{ gridColumn: smallWidth ? '' : 'span 2', display: 'flex', justifyContent: 'center' }}>
          <Button
            data-test-id='connect-qs'
            onClick={() => {
              onQsConnect?.({
                name: serverName,
                ip: serverIp,
                versionOverride,
                proxyOverride,
                usernameOverride,
                passwordOverride
              })
            }}
          >Connect</Button>
        </div>}
      </div>
    </form>
  </Screen>
}

const InputWithLabel = ({ label, span, ...props }: React.ComponentProps<typeof Input> & { label, span?}) => {
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    gridRow: span ? 'span 2 / span 2' : undefined,
  }}>
    <label style={{ fontSize: 12, marginBottom: 1, color: 'lightgray' }}>{label}</label>
    <Input {...props} />
  </div>
}
