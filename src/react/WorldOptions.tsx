import Screen from './Screen'
import Button from './Button'

const options = {
  'Save to device' () { },
  // todo icons
  'Save to Browser Memory' () { },
  'Reset' () { },
}
export default () => {
  return <Screen title="World Options">
    {
      Object.entries(options).map(([title, fn]) => <Button inScreen key={title} onClick={fn}>{title}</Button>)
    }
  </Screen>
}
