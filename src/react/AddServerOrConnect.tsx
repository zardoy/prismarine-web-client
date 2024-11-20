import React from 'react'
import Screen from './Screen'
import Input from './Input'
import Button from './Button'
import SelectGameVersion from './SelectGameVersion'
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
  placeholders?: Pick<BaseServerInfo, 'proxyOverride' | 'usernameOverride'>
  accounts?: string[]
  authenticatedAccounts?: number
  versions?: string[]
}

const ELEMENTS_WIDTH = 190

export default ({ onBack, onConfirm, title = 'Add a Server', initialData, parseQs, onQsConnect, placeholders, accounts, versions, authenticatedAccounts }: Props) => {
  const qsParams = parseQs ? new URLSearchParams(window.location.search) : undefined
  const qsParamName = qsParams?.get('name')
  const qsParamIp = qsParams?.get('ip')
  const qsParamVersion = qsParams?.get('version')
  const qsParamProxy = qsParams?.get('proxy')
  const qsParamUsername = qsParams?.get('username')
  const qsParamLockConnect = qsParams?.get('lockConnect')

  const qsIpParts = qsParamIp?.split(':')
  const ipParts = initialData?.ip.split(':')

  const [serverName, setServerName] = React.useState(initialData?.name ?? qsParamName ?? '')
  const [serverIp, setServerIp] = React.useState(ipParts?.[0] ?? qsIpParts?.[0] ?? '')
  const [serverPort, setServerPort] = React.useState(ipParts?.[1] ?? qsIpParts?.[1] ?? '')
  const [versionOverride, setVersionOverride] = React.useState(initialData?.versionOverride ?? /* legacy */ initialData?.['version'] ?? qsParamVersion ?? '')
  const [proxyOverride, setProxyOverride] = React.useState(initialData?.proxyOverride ?? qsParamProxy ?? '')
  const [usernameOverride, setUsernameOverride] = React.useState(initialData?.usernameOverride ?? qsParamUsername ?? '')
  const lockConnect = qsParamLockConnect === 'true'

  const smallWidth = useIsSmallWidth()
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

  return <Screen title={qsParamIp ? 'Connect to Server' : title} backdrop>
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
      }}
      >
        {!lockConnect && <>
          <div style={{ gridColumn: smallWidth ? '' : 'span 2', display: 'flex', justifyContent: 'center' }}>
            <InputWithLabel label="Server Name" value={serverName} onChange={({ target: { value } }) => setServerName(value)} placeholder='Defaults to IP' />
          </div>
        </>}
        <InputWithLabel required label="Server IP" value={serverIp} disabled={lockConnect && qsIpParts?.[0] !== null} onChange={({ target: { value } }) => setServerIp(value)} />
        <InputWithLabel label="Server Port" value={serverPort} disabled={lockConnect && qsIpParts?.[1] !== null} onChange={({ target: { value } }) => setServerPort(value)} placeholder='25565' />
        <div style={{ gridColumn: smallWidth ? '' : 'span 2' }}>Overrides:</div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
        }}>
          <label style={{ fontSize: 12, marginBottom: 1, color: 'lightgray' }}>Version Override</label>
          <SelectGameVersion
            selected={{ value: versionOverride, label: versionOverride }}
            versions={versions?.map(v => { return { value: v, label: v } }) ?? []}
            onChange={(value) => {
              setVersionOverride(value)
            }}
            placeholder="Optional, but recommended to specify"
            disabled={lockConnect && qsParamVersion !== null}
          />
        </div>

        <InputWithLabel label="Proxy Override" value={proxyOverride} disabled={lockConnect && qsParamProxy !== null} onChange={({ target: { value } }) => setProxyOverride(value)} placeholder={placeholders?.proxyOverride} />
        <InputWithLabel label="Username Override" value={usernameOverride} disabled={!noAccountSelected || lockConnect && qsParamUsername !== null} onChange={({ target: { value } }) => setUsernameOverride(value)} placeholder={placeholders?.usernameOverride} />
        <label style={{
          display: 'flex',
          flexDirection: 'column',
        }}
        >
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
        {qsParamIp && <div style={{ gridColumn: smallWidth ? '' : 'span 2', display: 'flex', justifyContent: 'center' }}>
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

const InputWithLabel = ({ label, span, ...props }: React.ComponentProps<typeof Input> & { label, span? }) => {
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    gridRow: span ? 'span 2 / span 2' : undefined,
  }}
  >
    <label style={{ fontSize: 12, marginBottom: 1, color: 'lightgray' }}>{label}</label>
    <Input rootStyles={{ width: ELEMENTS_WIDTH }} {...props} />
  </div>
}

const fallbackIfNotFound = (index: number) => (index === -1 ? undefined : index)
