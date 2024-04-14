/* global postMessage self */

// todo rename to mesher!
if (!global.self) {
  // If we are in a node environement, we need to fake some env variables
  /* eslint-disable no-eval */
  const r = eval('require') // yeah I know bad spooky eval, booouh
  const { parentPort } = r('worker_threads')
  global.self = parentPort
  global.postMessage = (value, transferList) => { parentPort.postMessage(value, transferList) }
  global.performance = r('perf_hooks').performance
}

const { Vec3 } = require('vec3')
const { World } = require('./world')
const { getSectionGeometry, setBlockStates } = require('./models')

let world = null
let dirtySections = {}
let blockStatesReady = false

function sectionKey (x, y, z) {
  return `${x},${y},${z}`
}

function setSectionDirty (pos, value = true) {
  const x = Math.floor(pos.x / 16) * 16
  const y = Math.floor(pos.y / 16) * 16
  const z = Math.floor(pos.z / 16) * 16
  const chunk = world.getColumn(x, z)
  const key = sectionKey(x, y, z)
  if (!value) {
    delete dirtySections[key]
    postMessage({ type: 'sectionFinished', key })
  } else if (chunk?.getSection(pos)) {
    dirtySections[key] = value
  } else {
    postMessage({ type: 'sectionFinished', key })
  }
}

self.onmessage = ({ data }) => {
  if (data.type === 'mcData') {
    globalThis.mcData = data.mcData
    world = new World(data.version)
  } else if (data.type === 'blockStates') {
    setBlockStates(data.json)
    blockStatesReady = true
  } else if (data.type === 'dirty') {
    const loc = new Vec3(data.x, data.y, data.z)
    setSectionDirty(loc, data.value)
  } else if (data.type === 'chunk') {
    world.addColumn(data.x, data.z, data.chunk)
  } else if (data.type === 'unloadChunk') {
    world.removeColumn(data.x, data.z)
  } else if (data.type === 'blockUpdate') {
    const loc = new Vec3(data.pos.x, data.pos.y, data.pos.z).floored()
    world.setBlockStateId(loc, data.stateId)
  } else if (data.type === 'reset') {
    world = null
    blocksStates = null
    dirtySections = {}
    // todo also remove cached
    globalThis.mcData = null
    blockStatesReady = false
  }
}

setInterval(() => {
  if (world === null || !blockStatesReady) return
  const sections = Object.keys(dirtySections)

  if (sections.length === 0) return
  // console.log(sections.length + ' dirty sections')

  // const start = performance.now()
  for (const key of sections) {
    let [x, y, z] = key.split(',')
    x = parseInt(x, 10)
    y = parseInt(y, 10)
    z = parseInt(z, 10)
    const chunk = world.getColumn(x, z)
    if (chunk?.getSection(new Vec3(x, y, z))) {
      delete dirtySections[key]
      const geometry = getSectionGeometry(x, y, z, world)
      const transferable = [geometry.positions.buffer, geometry.normals.buffer, geometry.colors.buffer, geometry.uvs.buffer]
      postMessage({ type: 'geometry', key, geometry }, transferable)
    }
    postMessage({ type: 'sectionFinished', key })
  }
  // const time = performance.now() - start
  // console.log(`Processed ${sections.length} sections in ${time} ms (${time / sections.length} ms/section)`)
}, 50)
