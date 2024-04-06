import React from 'react'
import Screen from './Screen'
import Input from './Input'
import Button from './Button'
import { useIsSmallWidth } from './simpleHooks'

export interface NewServerInfo {
  ip: string
  versionOverride?: string
  proxyOverride?: string
  usernameOverride?: string
  passwordOverride?: string
}

interface Props {
  onBack: () => void
  onConfirm: (info: NewServerInfo) => void
  title?: string
}

export default ({ onBack, onConfirm, title = 'Add a Server' }: Props) => {
  const [serverIp, setServerIp] = React.useState('')
  const [serverPort, setServerPort] = React.useState('')
  const [versionOverride, setVersionOverride] = React.useState('')
  const [proxyOverride, setProxyOverride] = React.useState('')
  const [usernameOverride, setUsernameOverride] = React.useState('')
  const [passwordOverride, setPasswordOverride] = React.useState('')
  // const smallWidth = useIsSmallWidth()
  const smallWidth = true

  return <Screen title={title} backdrop>
    <form style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}
    onSubmit={() => {
      const ip = serverIp.includes(':') ? serverIp : `${serverIp}:${serverPort ?? 25_565}`
      onConfirm({
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
        <InputWithLabel required label="Server IP" value={serverIp} onChange={({ target: { value } }) => setServerIp(value)} />
        <InputWithLabel label="Server Port" value={serverPort} onChange={({ target: { value } }) => setServerPort(value)} placeholder='25565' />
        <div style={{ gridColumn: 'span 2' }}>Overrides:</div>
        <InputWithLabel label="Version Override" value={versionOverride} onChange={({ target: { value } }) => setVersionOverride(value)} />
        <InputWithLabel label="Proxy Override" value={proxyOverride} onChange={({ target: { value } }) => setProxyOverride(value)} />
        <InputWithLabel label="Username Override" value={usernameOverride} onChange={({ target: { value } }) => setUsernameOverride(value)} />
        <InputWithLabel label="Password Override" value={passwordOverride} onChange={({ target: { value } }) => setPasswordOverride(value)} />
      </div>
      <div style={{
        marginBottom: 3,
        display: 'flex',
        gap: 5,
        justifyContent: 'center',
      }}>
        <Button onClick={() => {
          onBack()
        }}>Cancel</Button>
        <Button type='submit'>Save</Button>
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
