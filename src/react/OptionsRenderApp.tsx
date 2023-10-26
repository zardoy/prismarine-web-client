import { useSnapshot } from 'valtio'
import { activeModalStack, hideCurrentModal } from '../globalState'
import { OptionsGroupType } from '../optionsGuiScheme'
import { uniqueFileNameFromWorldName, copyFilesAsyncWithProgress } from '../browserfs'
import { fsState } from '../loadSave'
import Button from './Button'
import OptionsGroup from './OptionsGroup'
import { showOptionsModal } from './SelectOption'

export default () => {
  const { reactType } = useSnapshot(activeModalStack).at(-1) ?? {}
  if (!reactType?.startsWith('options-')) return
  const settingsGroup = reactType.slice('options-'.length) as OptionsGroupType

  return <div>
    <OptionsGroup group={settingsGroup} backButtonAction={hideCurrentModal} />
    <Button icon='pixelarticons:folder' onClick={openWorldActions} style={{ position: 'fixed', bottom: 5, left: 5 }} title='World actions' />
  </div>
}

const openWorldActions = async () => {
  if (fsState.inMemorySave) {
    return showOptionsModal('World actions...', [])
  }
  const action = await showOptionsModal('World actions...', ['Save to browser memory'])
  if (action === 'Save to browser memory') {
    const { worldFolder } = localServer.options
    const savePath = await uniqueFileNameFromWorldName(worldFolder.split('/').pop(), `/data/worlds`)
    await copyFilesAsyncWithProgress(worldFolder, savePath)
  }
}
