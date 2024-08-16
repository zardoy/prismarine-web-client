import { useSnapshot } from 'valtio'
import { miscUiState } from './globalState'
import Input from './react/Input'

function InnerSearch () {
  const { currentTouch } = useSnapshot(miscUiState)

  return <div style={{
    position: 'fixed',
    top: 5,
    left: 0,
    right: 0,
    margin: 'auto',
    zIndex: 11,
    width: 'min-content',
  }}
  >
    <Input
      autoFocus={currentTouch === false}
      width={50}
      placeholder='Search...'
      defaultValue=""
      onChange={({ target: { value } }) => {
        customEvents.emit('search', value)
      }}
    />
  </div>
}

// todo remove component as its not possible to reuse this component atm
export default () => {
  const { displaySearchInput } = useSnapshot(miscUiState)

  return displaySearchInput ? <InnerSearch /> : null
}
