import React, { useEffect, useRef } from 'react'
import { isMobile } from 'prismarine-viewer/viewer/lib/simpleUtils'
import styles from './input.module.css'

interface Props extends React.ComponentProps<'input'> {
  rootStyles?: React.CSSProperties
  autoFocus?: boolean
  inputRef?: React.RefObject<HTMLInputElement>
}

export default ({ autoFocus, rootStyles, inputRef, ...inputProps }: Props) => {
  const ref = useRef<HTMLInputElement>(null!)

  useEffect(() => {
    if (inputRef) (inputRef as any).current = ref.current
    if (!autoFocus || isMobile()) return // Don't make screen keyboard popup on mobile
    ref.current.focus()
  }, [])

  return <div className={styles.container} style={rootStyles}>
    <input ref={ref} className={styles.input} autoComplete='off' autoCapitalize='off' autoCorrect='off' autoSave='off' spellCheck='false' {...inputProps} />
  </div>
}
