import { useEffect, useState } from 'react'
import { Transition } from 'react-transition-group'
import styles from './diveAnimation.module.css'

// dive animation from framework7

const startStyle = { opacity: 0, transform: 'translateZ(-150px)' }
const endExitStyle = { opacity: 0, transform: 'translateZ(150px)' }
const endStyle = { opacity: 1, transform: 'translateZ(0)' }

const stateStyles = {
  entering: startStyle,
  entered: endStyle,
  exiting: endExitStyle,
  exited: endExitStyle,
}
const duration = 300
const basicStyle = {
  transition: `${duration}ms ease-in-out all`,
}

export default ({ children, open }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!mounted && open) {
      setMounted(true)
    }
  }, [open])

  if (!mounted) return null

  return <Transition
    in={open}
    timeout={duration}
    mountOnEnter
    unmountOnExit
  >
    {(state) => {
      return <div className={styles.container}>
        {/* todo resolve compl */}
        <div style={{ ...basicStyle, ...stateStyles[state] }} className={styles.main}>{children}</div>
      </div>
    }}
  </Transition>

}
