import classNames from 'classnames'
import { useMemo, useRef, useState } from 'react'

// todo optimize size
import missingWorldPreview from 'minecraft-assets/minecraft-assets/data/1.10/gui/presets/isles.png'
import { filesize } from 'filesize'
import useTypedEventListener from 'use-typed-event-listener'
import { focusable } from 'tabbable'
import styles from './singleplayer.module.css'
import Input from './Input'
import Button from './Button'

export interface WorldProps {
  name: string
  title: string
  size?: number
  lastPlayed?: number
  isFocused?: boolean
  onFocus?: (name: string) => void
  detail?: string
  onInteraction?(interaction: 'enter' | 'space')
}
const World = ({ name, isFocused, title, lastPlayed, size, detail = '', onFocus, onInteraction }: WorldProps) => {
  const timeRelativeFormatted = useMemo(() => {
    if (!lastPlayed) return
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
    if (!size) return
    return filesize(size)
  }, [size])

  return <div className={classNames(styles.world_root, isFocused ? styles.world_focused : undefined)} tabIndex={0} onFocus={() => onFocus?.(name)} onKeyDown={(e) => {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault()
      onInteraction?.(e.code === 'Enter' ? 'enter' : 'space')
    }
  }} onDoubleClick={() => onInteraction?.('enter')}>
    <img className={styles.world_image} src={missingWorldPreview} />
    <div className={styles.world_info}>
      <div className={styles.world_title} title='level.dat world name'>{title}</div>
      <div className='muted'>{timeRelativeFormatted} {detail.slice(-30)}</div>
      <div className='muted'>{sizeFormatted}</div>
    </div>
  </div>
}

interface Props {
  worldData: WorldProps[]
  onWorldAction (action: 'load' | 'export' | 'delete' | 'edit', worldName: string): void
  onGeneralAction (action: 'cancel' | 'create'): void
}

export default ({ worldData, onGeneralAction, onWorldAction }: Props) => {
  const containerRef = useRef<any>()
  const firstButton = useRef<HTMLButtonElement>(null!)

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

  return <div ref={containerRef}>
    <div className="dirt-bg" />
    <div className={classNames('fullscreen', styles.root)}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span className={classNames('screen-title', styles.title)}>Select Saved World</span>
        <Input autoFocus value={search} onChange={({ target: { value } }) => setSearch(value)} />
      </div>
      <div className={styles.content}>
        {
          worldData.filter(data => data.title.toLowerCase().includes(search.toLowerCase())).map(({ name, title, size, lastPlayed, detail }) => (
            <World title={title} lastPlayed={lastPlayed} size={size} name={name} onFocus={setFocusedWorld} isFocused={focusedWorld === name} key={name} onInteraction={(interaction) => {
              if (interaction === 'enter') onWorldAction('load', name)
              else if (interaction === 'space') firstButton.current?.focus()
            }} detail={detail} />
          ))
        }
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 400 }}>
        <div>
          <Button rootRef={firstButton} disabled={!focusedWorld} onClick={() => onWorldAction('load', focusedWorld)}>LOAD WORLD</Button>
          <Button onClick={() => onGeneralAction('create')}>Create New World</Button>
        </div>
        <div>
          <Button style={{ width: 100 }} disabled={!focusedWorld} onClick={() => onWorldAction('export', focusedWorld)}>Export</Button>
          <Button style={{ width: 100 }} disabled={!focusedWorld} onClick={() => onWorldAction('delete', focusedWorld)}>Delete</Button>
          <Button style={{ width: 100 }} /* disabled={!focusedWorld}  */ onClick={() => onWorldAction('edit', focusedWorld)} disabled>Edit</Button>
          <Button style={{ width: 100 }} onClick={() => onGeneralAction('cancel')}>Cancel</Button>
        </div>
      </div>
    </div>
  </div>
}
