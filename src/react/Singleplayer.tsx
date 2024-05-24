import classNames from 'classnames'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'

// todo optimize size
import missingWorldPreview from 'minecraft-assets/minecraft-assets/data/1.10/gui/presets/isles.png'
import { filesize } from 'filesize'
import useTypedEventListener from 'use-typed-event-listener'
import { focusable } from 'tabbable'
import styles from './singleplayer.module.css'
import Input from './Input'
import Button from './Button'
import Tabs from './Tabs'
import MessageFormattedString from './MessageFormattedString'

export interface WorldProps {
  name: string
  title: string
  size?: number
  lastPlayed?: number
  isFocused?: boolean
  iconSrc?: string
  detail?: string
  formattedTextOverride?: string
  worldNameRight?: string
  onFocus?: (name: string) => void
  onInteraction?(interaction: 'enter' | 'space')
}

const World = ({ name, isFocused, title, lastPlayed, size, detail = '', onFocus, onInteraction, iconSrc, formattedTextOverride, worldNameRight }: WorldProps) => {
  const timeRelativeFormatted = useMemo(() => {
    if (!lastPlayed) return ''
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    const diff = Date.now() - lastPlayed
    const minutes = Math.floor(diff / 1000 / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    // const weeks = Math.floor(days / 7)
    // const months = Math.floor(days / 30)
    if (days > 0) return formatter.format(-days, 'day')
    if (hours > 0) return formatter.format(-hours, 'hour')
    return formatter.format(-minutes, 'minute')
  }, [lastPlayed])
  const sizeFormatted = useMemo(() => {
    if (!size) return ''
    return filesize(size)
  }, [size])

  return <div className={classNames(styles.world_root, isFocused ? styles.world_focused : undefined)} tabIndex={0} onFocus={() => onFocus?.(name)} onKeyDown={(e) => {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault()
      onInteraction?.(e.code === 'Enter' ? 'enter' : 'space')
    }
  }} onDoubleClick={() => onInteraction?.('enter')}>
    <img className={`${styles.world_image} ${iconSrc ? '' : styles.image_missing}`} src={iconSrc ?? missingWorldPreview} alt='world preview' />
    <div className={styles.world_info}>
      <div className={styles.world_title}>
        <div>{title}</div>
        <div className={styles.world_title_right}>{worldNameRight}</div>
      </div>
      {formattedTextOverride ? <div className={styles.world_info_formatted}>
        <MessageFormattedString message={formattedTextOverride} />
      </div> :
        <>
          <div className={styles.world_info_description_line}>{timeRelativeFormatted} {detail.slice(-30)}</div>
          <div className={styles.world_info_description_line}>{sizeFormatted}</div>
        </>}
    </div>
  </div>
}

interface Props {
  worldData: WorldProps[] | null // null means loading
  serversLayout?: boolean
  firstRowChildrenOverride?: React.ReactNode
  searchRowChildrenOverride?: React.ReactNode
  providers?: Record<string, string>
  activeProvider?: string
  setActiveProvider?: (provider: string) => void
  providerActions?: Record<string, (() => void) | undefined | JSX.Element>
  disabledProviders?: string[]
  isReadonly?: boolean
  error?: string
  warning?: string
  warningAction?: () => void
  warningActionLabel?: string

  onWorldAction (action: 'load' | 'export' | 'delete' | 'edit', worldName: string): void
  onGeneralAction (action: 'cancel' | 'create'): void
}

export default ({
  worldData,
  onGeneralAction,
  onWorldAction,
  firstRowChildrenOverride,
  serversLayout,
  searchRowChildrenOverride,
  activeProvider,
  setActiveProvider,
  providerActions,
  providers = {},
  disabledProviders,
  error,
  isReadonly,
  warning, warningAction, warningActionLabel
}: Props) => {
  const containerRef = useRef<any>()
  const firstButton = useRef<HTMLButtonElement>(null)

  useTypedEventListener(window, 'keydown', (e) => {
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
      e.preventDefault()
      const dir = e.code === 'ArrowDown' ? 1 : -1
      const elements = focusable(containerRef.current)
      const focusedElemIndex = elements.indexOf(document.activeElement as HTMLElement)
      if (focusedElemIndex === -1) return
      const nextElem = elements[focusedElemIndex + dir]
      nextElem?.focus()
    }
  })

  const [search, setSearch] = useState('')
  const [focusedWorld, setFocusedWorld] = useState('')

  useEffect(() => {
    setFocusedWorld('')
  }, [activeProvider])

  return <div ref={containerRef}>
    <div className="dirt-bg" />
    <div className={classNames('fullscreen', styles.root)}>
      <span className={classNames('screen-title', styles.title)}>{serversLayout ? 'Join Java Servers' : 'Select Saved World'}</span>
      {searchRowChildrenOverride || <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Input autoFocus value={search} onChange={({ target: { value } }) => setSearch(value)} />
      </div>}
      <div className={classNames(styles.content, !worldData && styles.content_loading)}>
        <Tabs tabs={Object.keys(providers)} disabledTabs={disabledProviders} activeTab={activeProvider ?? ''} labels={providers} onTabChange={(tab) => {
          setActiveProvider?.(tab as any)
        }} fullSize />
        <div style={{
          marginTop: 3,
        }}>
          {
            providerActions && <div style={{
              display: 'flex',
              alignItems: 'center',
              // overflow: 'auto',
            }}>
              <span style={{ fontSize: 9, marginRight: 3 }}>Actions: </span> {Object.entries(providerActions).map(([label, action]) => (
                typeof action === 'function' ? <Button key={label} onClick={action} style={{ width: 100 }}>{label}</Button> : <Fragment key={label}>{action}</Fragment>
              ))}
            </div>
          }
          {
            worldData
              ? worldData.filter(data => data.title.toLowerCase().includes(search.toLowerCase())).map(({ name, size, detail, ...rest }) => (
                <World {...rest} size={size} name={name} onFocus={setFocusedWorld} isFocused={focusedWorld === name} key={name} onInteraction={(interaction) => {
                  if (interaction === 'enter') onWorldAction('load', name)
                  else if (interaction === 'space') firstButton.current?.focus()
                }} detail={detail} />
              ))
              : <div style={{
                fontSize: 10,
                color: error ? 'red' : 'lightgray',
              }}>{error || 'Loading (check #dev console if loading too long)...'}</div>
          }
          {
            warning && <div style={{
              fontSize: 8,
              color: '#ffa500ba',
              marginTop: 5,
              textAlign: 'center',
            }}>
              {warning} {warningAction && <a onClick={warningAction}>{warningActionLabel}</a>}
            </div>
          }
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 400, paddingBottom: 3 }}>
        {firstRowChildrenOverride || <div>
          <Button rootRef={firstButton} disabled={!focusedWorld} onClick={() => onWorldAction('load', focusedWorld)}>Load World</Button>
          <Button onClick={() => onGeneralAction('create')} disabled={isReadonly}>Create New World</Button>
        </div>}
        <div>
          {serversLayout ? <Button style={{ width: 100 }} disabled={!focusedWorld} onClick={() => onWorldAction('edit', focusedWorld)}>Edit</Button> : <Button style={{ width: 100 }} disabled={!focusedWorld} onClick={() => onWorldAction('export', focusedWorld)}>Export</Button>}
          <Button style={{ width: 100 }} disabled={!focusedWorld} onClick={() => onWorldAction('delete', focusedWorld)}>Delete</Button>
          {serversLayout ?
            <Button style={{ width: 100 }} onClick={() => onGeneralAction('create')}>Add</Button> :
            <Button style={{ width: 100 }} /* disabled={!focusedWorld}  */ onClick={() => onWorldAction('edit', focusedWorld)} disabled>Edit</Button>}
          <Button style={{ width: 100 }} onClick={() => onGeneralAction('cancel')}>Cancel</Button>
        </div>
      </div>
    </div>
  </div>
}
