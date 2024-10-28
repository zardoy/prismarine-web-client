import EventEmitter from 'events'

window.reportError = window.reportError ?? console.error
window.bot = undefined
window.THREE = undefined
window.localServer = undefined
window.worldView = undefined
window.viewer = undefined
window.loadedData = undefined
window.customEvents = new EventEmitter()
