import { Transition } from 'react-transition-group'
import PixelartIcon from './PixelartIcon'

// slide up
const startStyle = { opacity: 0, transform: 'translateY(100%)' }
const endExitStyle = { opacity: 0, transform: 'translateY(-100%)' }
const endStyle = { opacity: 1, transform: 'translateY(0)' }

const stateStyles = {
  entering: startStyle,
  entered: endStyle,
  exiting: endExitStyle,
  exited: endExitStyle,
}
const duration = 200
const basicStyle = {
  transition: `${duration}ms ease-in-out all`,
}

// save pass: login

export default ({ type = 'message', message, subMessage = '', open, icon = '', action = undefined as (() => void) | undefined }) => {
  const isError = type === 'error'
  icon ||= isError ? 'alert' : 'message'

  return <Transition
    in={open}
    timeout={duration}
    mountOnEnter
    unmountOnExit
  >
    {state => {
      const addStyles = { ...basicStyle, ...stateStyles[state] }

      return <div
        className={`app-notification ${isError ? 'error-notification' : ''}`} onClick={action} style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '180px',
          whiteSpace: 'nowrap',
          fontSize: '9px',
          display: 'flex',
          gap: 4,
          alignItems: 'center',
          padding: '3px 5px',
          background: isError ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.7)',
          borderRadius: '0 0 0 5px',
          pointerEvents: action ? '' : 'none',
          zIndex: 1200, // even above stats
          ...addStyles
        }}
      >
        <PixelartIcon iconName={icon} styles={{ fontSize: 12 }} />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
        >
          <div>
            {message}
          </div>
          <div style={{
            fontSize: '7px',
            whiteSpace: 'nowrap',
            color: 'lightgray',
          }}
          >{subMessage}
          </div>
        </div>
      </div>
    }}
  </Transition>

}
