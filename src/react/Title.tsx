import React, { useState, useEffect } from 'react'
import { Transition } from 'react-transition-group'
import type { MessageFormatPart } from '../botUtils'
import MessageFormatted from './MessageFormatted'
import './Title.css'

type AnimationTimes = {
  fadeIn: number,
  stay: number,
  fadeOut: number
}

type TitleProps = {
  title: MessageFormatPart[],
  subtitle: MessageFormatPart[],
  actionBar: MessageFormatPart[],
  transitionTimes: AnimationTimes,
  open: boolean
}


const defaultText: MessageFormatPart[] = [{ text: '' }]

const Title = (
  {
    title = defaultText, 
    subtitle = defaultText, 
    actionBar = defaultText, 
    transitionTimes = {
      fadeIn: 2500,
      stay: 17_500,
      fadeOut: 5000
    },
    open = true
  }: TitleProps
) => {
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
    if (!mounted && open) {
      setMounted(true)
    }
  }, [open])
  //const [open, setOpen] = useState(open);

  // useEffect(() => {
  //   setTimeout(() => {
  //     setOpen(false) 
  //   }, transitionTimes.stay);
  // }, [])

  return (
    <Transition
      in={open}
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
          <div style={{ ...stateStyles[state] }} className='message-container'>
            <div className='titleScreen'>
              <h1 className='message-title'>
                <MessageFormatted parts={title} />
              </h1>
              <h4 className='message-subtitle'>
                <MessageFormatted parts={subtitle} />
              </h4>
            </div>
            <div className='actionScreen'>
              <div className='action-bar'>
                <MessageFormatted parts={actionBar} />
              </div>
            </div>
          </div>
        )
      }}
    </Transition>
  )
}

export default Title
