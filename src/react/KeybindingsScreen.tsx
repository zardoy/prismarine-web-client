import Screen from './Screen'

export default ({
  onBack,
  onReset,
    onSet,
  keybindings
}) => {
  return <Screen title="Keybindings" backdrop>
    <p>Here you can change the keybindings for the game.</p>
  </Screen>
}
