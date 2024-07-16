import React, { useEffect } from 'react'
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
  /** Username or always use new if true */
  authenticatedAccountOverride?: string | true
}

interface Props {
  onBack: () => void
  onConfirm: (info: BaseServerInfo) => void
  title?: string
  initialData?: BaseServerInfo
  parseQs?: boolean
  onQsConnect?: (server: BaseServerInfo) => void
  defaults?: Pick<BaseServerInfo, 'proxyOverride' | 'usernameOverride'>
  accounts?: string[]
  authenticatedAccounts?: number
}

const ELEMENTS_WIDTH = 190

export default ({ onBack, onConfirm, title = 'Add a Server', initialData, parseQs, onQsConnect, defaults, accounts, authenticatedAccounts }: Props) => {
  const qsParams = parseQs ? new URLSearchParams(window.location.search) : undefined

  const [serverName, setServerName] = React.useState(initialData?.name ?? qsParams?.get('name') ?? '')

  const ipWithoutPort = initialData?.ip.split(':')[0]
  const port = initialData?.ip.split(':')[1]

  const [serverIp, setServerIp] = React.useState(ipWithoutPort ?? qsParams?.get('ip') ?? '')
  const [serverPort, setServerPort] = React.useState(port ?? '')
  const [versionOverride, setVersionOverride] = React.useState(initialData?.versionOverride ?? /* legacy */ initialData?.['version'] ?? qsParams?.get('version') ?? '')
  const [proxyOverride, setProxyOverride] = React.useState(initialData?.proxyOverride ?? qsParams?.get('proxy') ?? '')
  const [usernameOverride, setUsernameOverride] = React.useState(initialData?.usernameOverride ?? qsParams?.get('username') ?? '')
  const smallWidth = useIsSmallWidth()
  const lockConnect = qsParams?.get('lockConnect') === 'true'
  const initialAccount = initialData?.authenticatedAccountOverride
  const [accountIndex, setAccountIndex] = React.useState(initialAccount === true ? -2 : initialAccount ? (accounts?.includes(initialAccount) ? accounts.indexOf(initialAccount) : -2) : -1)

  const freshAccount = accountIndex === -2
  const noAccountSelected = accountIndex === -1
  const authenticatedAccountOverride = noAccountSelected ? undefined : freshAccount ? true : accounts?.[accountIndex]

  let ipFinal = serverIp.includes(':') ? serverIp : `${serverIp}:${serverPort}`
  ipFinal = ipFinal.replace(/:$/, '')
  const commonUseOptions: BaseServerInfo = {
    name: serverName,
    ip: ipFinal,
    versionOverride: versionOverride || undefined,
    proxyOverride: proxyOverride || undefined,
    usernameOverride: usernameOverride || undefined,
    authenticatedAccountOverride,
  }

  return <Screen title={qsParams?.get('ip') ? 'Connect to Server' : title} backdrop>
    <form
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
      onSubmit={(e) => {
        e.preventDefault()
        onConfirm(commonUseOptions)
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
        <InputWithLabel label="Username Override" value={usernameOverride} onChange={({ target: { value } }) => setUsernameOverride(value)} placeholder={defaults?.usernameOverride} disabled={!noAccountSelected} />
        <label style={{
          display: 'flex',
          flexDirection: 'column',
        }}>
          <span style={{ fontSize: 12, marginBottom: 1, color: 'lightgray' }}>Account Override</span>
          <select
            onChange={({ target: { value } }) => setAccountIndex(Number(value))}
            style={{
              background: 'gray',
              color: 'white',
              height: 20,
              fontSize: 13,
            }}
            defaultValue={initialAccount === true ? -2 : initialAccount === undefined ? -1 : (fallbackIfNotFound((accounts ?? []).indexOf(initialAccount)) ?? -2)}
          >
            <option value={-1}>Offline Account (Username)</option>
            {accounts?.map((account, i) => <option key={i} value={i}>{account} (Logged In)</option>)}
            <option value={-2}>Any other MS account</option>
          </select>
        </label>

        {!lockConnect && <>
          <ButtonWrapper onClick={() => {
            onBack()
          }}>Cancel</ButtonWrapper>
          <ButtonWrapper type='submit'>Save</ButtonWrapper>
        </>}
        {qsParams?.get('ip') && <div style={{ gridColumn: smallWidth ? '' : 'span 2', display: 'flex', justifyContent: 'center' }}>
          <ButtonWrapper
            data-test-id='connect-qs'
            onClick={() => {
              onQsConnect?.(commonUseOptions)
            }}
          >Connect</ButtonWrapper>
        </div>}
      </div>
    </form>
  </Screen>
}

const ButtonWrapper = ({ ...props }: React.ComponentProps<typeof Button>) => {
  props.style ??= {}
  props.style.width = ELEMENTS_WIDTH
  return <Button {...props} />
}

const InputWithLabel = ({ label, span, ...props }: React.ComponentProps<typeof Input> & { label, span?}) => {
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    gridRow: span ? 'span 2 / span 2' : undefined,
  }}>
    <label style={{ fontSize: 12, marginBottom: 1, color: 'lightgray' }}>{label}</label>
    <Input rootStyles={{ width: ELEMENTS_WIDTH }} {...props} />
  </div>
}

const fallbackIfNotFound = (index: number) => index === -1 ? undefined : index
