import React, { useEffect } from 'react'
import { proxy, useSnapshot } from 'valtio'
import Notification from './Notification'

type NotificationType = React.ComponentProps<typeof Notification> & {
  autoHide: boolean
  id: string
}

// todo stacking
export const notificationProxy = proxy({
  message: '',
  open: false,
  type: 'message',
  subMessage: '',
  icon: '',
  autoHide: true,
  id: '',
} satisfies NotificationType as NotificationType)

export const showNotification = (
  message: string,
  subMessage = '',
  isError = false,
  icon = '',
  action = undefined as (() => void) | undefined,
  autoHide = true
) => {
  notificationProxy.message = message
  notificationProxy.subMessage = subMessage
  notificationProxy.type = isError ? 'error' : 'message'
  notificationProxy.icon = icon
  notificationProxy.open = true
  notificationProxy.autoHide = autoHide
  notificationProxy.action = action
}
export const hideNotification = () => {
  // openNotification('') // reset
  notificationProxy.open = false
}

export default () => {
  const { autoHide, message, open, icon, type, subMessage, action } = useSnapshot(notificationProxy)

  useEffect(() => {
    if (autoHide && open) {
      setTimeout(() => {
        hideNotification()
      }, 7000)
    }
  }, [autoHide, open])

  // test
  // useEffect(() => {
  //   setTimeout(() => {
  //     openNotification('test', 'test', false, 'message')
  //   }, 1000)
  // }, [])

  return <Notification
    action={action}
    type={type}
    message={message}
    subMessage={subMessage}
    open={open}
    icon={icon}
  />
}
