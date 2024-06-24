import { World } from './world'
import { Vec3 } from 'vec3'
import { getSectionGeometry, setBlockStatesData } from './models'

if (module.require) {
  // If we are in a node environement, we need to fake some env variables
  const r = module.require
  const { parentPort } = r('worker_threads')
  global.self = parentPort
  global.postMessage = (value, transferList) => { parentPort.postMessage(value, transferList) }
  global.performance = r('perf_hooks').performance
}

let world: World
let dirtySections: Map<string, number> = new Map()
let blockStatesReady = false

function sectionKey (x, y, z) {
  return `${x},${y},${z}`
}

const batchMessagesLimit = 100

let queuedMessages = [] as any[]
let queueWaiting = false
const postMessage = (data, transferList = []) => {
  queuedMessages.push({ data, transferList })
  if (queuedMessages.length > batchMessagesLimit) {
    drainQueue(0, batchMessagesLimit)
  }
  if (queueWaiting) return
  queueWaiting = true
  setTimeout(() => {
    queueWaiting = false
    drainQueue(0, queuedMessages.length)
  })
}

function drainQueue (from, to) {
  const messages = queuedMessages.slice(from, to)
  global.postMessage(messages.map(m => m.data), messages.flatMap(m => m.transferList) as unknown as string)
  queuedMessages = queuedMessages.slice(to)
}

function setSectionDirty (pos, value = true) {
  const x = Math.floor(pos.x / 16) * 16
  const y = Math.floor(pos.y / 16) * 16
  const z = Math.floor(pos.z / 16) * 16
  const key = sectionKey(x, y, z)
  if (!value) {
    dirtySections.delete(key)
    postMessage({ type: 'sectionFinished', key })
    return
  }

  const chunk = world.getColumn(x, z)
  if (chunk?.getSection(pos)) {
    dirtySections.set(key, (dirtySections.get(key) || 0) + 1)
  } else {
    postMessage({ type: 'sectionFinished', key })
  }
}

const softCleanup = () => {
  // clean block cache and loaded chunks
  world = new World(world.config.version)
}

const handleMessage = data => {
  const globalVar: any = globalThis

  if (data.type === 'mcData') {
    globalVar.mcData = data.mcData
  }

  if (data.config) {
    world ??= new World(data.config.version)
    world.config = { ...world.config, ...data.config }
    globalThis.world = world
  }

  if (data.type === 'mesherData') {
    setBlockStatesData(data.json)
    blockStatesReady = true
  } else if (data.type === 'dirty') {
    const loc = new Vec3(data.x, data.y, data.z)
    setSectionDirty(loc, data.value)
  } else if (data.type === 'chunk') {
    world.addColumn(data.x, data.z, data.chunk)
  } else if (data.type === 'unloadChunk') {
    world.removeColumn(data.x, data.z)
    if (Object.keys(world.columns).length === 0) softCleanup()
  } else if (data.type === 'blockUpdate') {
    const loc = new Vec3(data.pos.x, data.pos.y, data.pos.z).floored()
    world.setBlockStateId(loc, data.stateId)
  } else if (data.type === 'reset') {
    world = undefined as any
    // blocksStates = null
    dirtySections = new Map()
    // todo also remove cached
    globalVar.mcData = null
    blockStatesReady = false
  }
}

self.onmessage = ({ data }) => {
  if (Array.isArray(data)) {
    data.forEach(handleMessage)
    return
  }

  handleMessage(data)
}

setInterval(() => {
  if (world === null || !blockStatesReady) return

  if (dirtySections.size === 0) return
  // console.log(sections.length + ' dirty sections')

  // const start = performance.now()
  for (const key of dirtySections.keys()) {
    let [x, y, z] = key.split(',').map(v => parseInt(v, 10))
    const chunk = world.getColumn(x, z)
    if (chunk?.getSection(new Vec3(x, y, z))) {
      const geometry = getSectionGeometry(x, y, z, world)
      const transferable = [geometry.positions.buffer, geometry.normals.buffer, geometry.colors.buffer, geometry.uvs.buffer]
      //@ts-ignore
      postMessage({ type: 'geometry', key, geometry }, transferable)
    } else {
      // console.info('[mesher] Missing section', x, y, z)
    }
    const dirtyTimes = dirtySections.get(key)
    if (!dirtyTimes) throw new Error('dirtySections.get(key) is falsy')
    for (let i = 0; i < dirtyTimes; i++) {
      postMessage({ type: 'sectionFinished', key })
    }
    dirtySections.delete(key)
  }
  // const time = performance.now() - start
  // console.log(`Processed ${sections.length} sections in ${time} ms (${time / sections.length} ms/section)`)
}, 50)
