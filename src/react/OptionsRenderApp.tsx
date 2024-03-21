import { useSnapshot } from 'valtio'
import { activeModalStack, hideCurrentModal } from '../globalState'
import { OptionsGroupType } from '../optionsGuiScheme'
import OptionsGroup from './OptionsGroup'

export default () => {
  const { reactType } = useSnapshot(activeModalStack).at(-1) ?? {}
  if (!reactType?.startsWith('options-')) return
  const settingsGroup = reactType.slice('options-'.length) as OptionsGroupType

  return <OptionsGroup group={settingsGroup} backButtonAction={hideCurrentModal} />
}
