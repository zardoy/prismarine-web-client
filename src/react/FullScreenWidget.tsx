import Screen from './Screen'
import { useIsWidgetActive } from './utils'

export default ({ name, title, children }) => {
  const isWidgetActive = useIsWidgetActive(name)

  if (!isWidgetActive) return null

  return <Screen backdrop title={title}>{children}</Screen>
}
