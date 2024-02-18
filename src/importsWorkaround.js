// workaround for mineflayer
process.versions.node = '18.0.0'

if (!navigator.getGamepads) {
  console.warn('navigator.getGamepads is not available, adding a workaround')
  navigator.getGamepads ??= () => []
}
