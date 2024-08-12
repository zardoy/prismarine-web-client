import { useState, useEffect } from 'react'
import { Transition } from 'react-transition-group'
import MessageFormattedString from './MessageFormattedString'
import './Title.css'

export type AnimationTimes = {
  fadeIn: number,
  stay: number,
  fadeOut: number
}

type TitleProps = {
  title: string | Record<string, any>,
  subtitle: string | Record<string, any>,
  actionBar: string | Record<string, any>,
  transitionTimes: AnimationTimes,
  openTitle: boolean,
  openActionBar: boolean
}

const Title = ({
  title,
  subtitle,
  actionBar,
  transitionTimes,
  openTitle = false,
  openActionBar = false
}: TitleProps) => {
  const [mounted, setMounted] = useState(false)
  const [useEnterTransition, setUseEnterTransition] = useState(true)

  const defaultDuration = 500
  const startStyle = {
    opacity: 1,
    transition: `${transitionTimes.fadeIn}ms ease-in-out all` }
  const endExitStyle = {
    opacity: 0,
    transition: `${transitionTimes.fadeOut}ms ease-in-out all` }

  const stateStyles = {
    entering: startStyle,
    entered: { opacity: 1 },
    exiting: endExitStyle,
    exited: { opacity: 0 },
  }

  useEffect(() => {
    if (!mounted && (openTitle || openActionBar)) {
      setMounted(true)
    }
  }, [openTitle, openActionBar])

  return (
    <div className='title-container'>
      <Transition
        in={openTitle}
        timeout={transitionTimes ? {
          enter: transitionTimes.fadeIn,
          exit: transitionTimes.fadeOut,
        } : defaultDuration}
        mountOnEnter
        unmountOnExit
        enter={useEnterTransition}
        onExiting={() => {
          setUseEnterTransition(prev => false)
        }}
        onExited={() => {
          setUseEnterTransition(prev => true)
        }}
      >
        {(state) => {
          return (
            <div style={{ ...stateStyles[state] }}>
              <h1 className='message-title'>
                <MessageFormattedString message={title} />
              </h1>
              <h4 className='message-subtitle'>
                <MessageFormattedString message={subtitle} />
              </h4>
            </div>
          )
        }}
      </Transition>
      <Transition
        in={openActionBar}
        timeout={transitionTimes ? {
          enter: transitionTimes.fadeIn,
          exit: transitionTimes.fadeOut,
        } : defaultDuration}
        mountOnEnter
        unmountOnExit
        // enter={useEnterTransition}
        // onExiting={() => {
        //   setUseEnterTransition(prev => false)
        // }}
        // onExited={() => {
        //   setUseEnterTransition(prev => true)
        // }}
      >
        {(state) => {
          return (
            <div style={{ ...stateStyles[state] }}>
              <div className='action-bar'>
                <MessageFormattedString message={actionBar} />
              </div>
            </div>
          )
        }}
      </Transition>
    </div>
  )
}

export default Title
