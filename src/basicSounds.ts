import { options } from './optionsStorage'
import { isCypress } from './standaloneUtils'
import { reportWarningOnce } from './utils'

let audioContext: AudioContext
const sounds: Record<string, any> = {}

// load as many resources on page load as possible instead on demand as user can disable internet connection after he thinks the page is loaded
const loadingSounds = [] as string[]
const convertedSounds = [] as string[]
export async function loadSound (path: string, contents = path) {
  if (loadingSounds.includes(path)) return true
  loadingSounds.push(path)
  const res = await window.fetch(contents)
  if (!res.ok) {
    const error = `Failed to load sound ${path}`
    if (isCypress()) throw new Error(error)
    else console.warn(error)
    return
  }
  const data = await res.arrayBuffer()

  sounds[path] = data
  loadingSounds.splice(loadingSounds.indexOf(path), 1)
}

export const loadOrPlaySound = async (url, soundVolume = 1) => {
  const soundBuffer = sounds[url]
  if (!soundBuffer) {
    const start = Date.now()
    const cancelled = await loadSound(url)
    if (cancelled || Date.now() - start > 500) return
  }

  await playSound(url)
}

export async function playSound (url, soundVolume = 1) {
  const volume = soundVolume * (options.volume / 100)

  if (!volume) return

  try {
    audioContext ??= new window.AudioContext()
  } catch (err) {
    reportWarningOnce('audioContext', 'Failed to create audio context. Some sounds will not play')
    return
  }

  for (const [soundName, sound] of Object.entries(sounds)) {
    if (convertedSounds.includes(soundName)) continue
    sounds[soundName] = await audioContext.decodeAudioData(sound)
    convertedSounds.push(soundName)
  }

  const soundBuffer = sounds[url]
  if (!soundBuffer) {
    console.warn(`Sound ${url} not loaded yet`)
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
