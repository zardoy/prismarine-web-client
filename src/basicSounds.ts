import { options } from './optionsStorage'

let audioContext: AudioContext
const sounds: Record<string, any> = {}

// load as many resources on page load as possible instead on demand as user can disable internet connection after he thinks the page is loaded
const loadingSounds = [] as string[]
const convertedSounds = [] as string[]
export async function loadSound (path: string) {
  if (loadingSounds.includes(path)) return
  loadingSounds.push(path)
  const res = await window.fetch(path)
  const data = await res.arrayBuffer()

  sounds[path] = data
  loadingSounds.splice(loadingSounds.indexOf(path), 1)
}

export async function playSound (path) {
  const volume = options.volume / 100

  if (!volume) return

  audioContext ??= new window.AudioContext()

  for (const [soundName, sound] of Object.entries(sounds)) {
    if (convertedSounds.includes(soundName)) continue
    sounds[soundName] = await audioContext.decodeAudioData(sound)
    convertedSounds.push(soundName)
  }

  const soundBuffer = sounds[path]
  if (!soundBuffer) {
    console.warn(`Sound ${path} not loaded`)
    return
  }

  const gainNode = audioContext.createGain()
  const source = audioContext.createBufferSource()
  source.buffer = soundBuffer
  source.connect(gainNode)
  gainNode.connect(audioContext.destination)
  gainNode.gain.value = volume
  source.start(0)
}
