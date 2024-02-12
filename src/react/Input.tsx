import React, { useEffect, useRef } from 'react'
import styles from './input.module.css'

interface Props extends React.ComponentProps<'input'> {
  autoFocus?: boolean
}

export default ({ autoFocus, ...inputProps }: Props) => {
  const ref = useRef<HTMLInputElement>(null!)

  useEffect(() => {
    if (!autoFocus || matchMedia('(pointer: coarse)').matches) return // Don't make screen keyboard popup on mobile
    ref.current.focus()
  }, [])

  return <div className={styles.container}>
    <input ref={ref} className={styles.input} autoComplete='off' autoCapitalize='off' autoCorrect='off' autoSave='off' spellCheck='false' {...inputProps} />
  </div>
}
