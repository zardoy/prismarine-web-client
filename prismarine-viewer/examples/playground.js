//@ts-check
/* global THREE, fetch */
const _ = require('lodash')
const { WorldView, Viewer, MapControls } = require('../viewer')
const { Vec3 } = require('vec3')
const { Schematic } = require('prismarine-schematic')
const BlockLoader = require('prismarine-block')
/** @type {import('prismarine-chunk')['default']} */
//@ts-ignore
const ChunkLoader = require('prismarine-chunk')
/** @type {import('prismarine-world')['default']} */
//@ts-ignore
const WorldLoader = require('prismarine-world');
const THREE = require('three')
const {GUI} = require('lil-gui')
const { toMajor } = require('../viewer/lib/version')
const { loadScript } = require('../viewer/lib/utils')
globalThis.THREE = THREE
//@ts-ignore
require('three/examples/js/controls/OrbitControls')

const gui = new GUI()

// initial values
const params = {
  skip: '',
  version: globalThis.includedVersions.sort((a, b) => {
    const s = (x) => {
      const parts = x.split('.');
      return +parts[0]+(+parts[1])
    }
    return s(a) - s(b)
  }).at(-1),
  block: '',
  metadata: 0,
  supportBlock: false,
  entity: '',
  removeEntity () {
    this.entity = ''
  },
  entityRotate: false,
}

const qs = new URLSearchParams(window.location.search)
qs.forEach((value, key) => {
  const parsed = value.match(/^-?\d+$/) ? parseInt(value) : value === 'true' ? true : value === 'false' ? false : value
  params[key] = parsed
})
const setQs = () => {
  const newQs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (!value || typeof value === 'function' || params.skip.includes(key)) continue
    //@ts-ignore
    newQs.set(key, value)
  }
  window.history.replaceState({}, '', `${window.location.pathname}?${newQs}`)
}

async function main () {
  const { version } = params
  // temporary solution until web worker is here, cache data for faster reloads
  if (!window['mcData']['version']) {
    const sessionKey = `mcData-${version}`;
    if (sessionStorage[sessionKey]) {
      window['mcData'][version] = JSON.parse(sessionStorage[sessionKey])
    } else {
      await loadScript(`./mc-data/${toMajor(version)}.js`)
      sessionStorage[sessionKey] = JSON.stringify(window['mcData'][version])
    }
  }

  const mcData = require('minecraft-data')(version)
  window['loadedData'] = mcData

  gui.add(params, 'version', globalThis.includedVersions)
  gui.add(params, 'block', mcData.blocksArray.map(b => b.name))
  const metadataGui = gui.add(params, 'metadata')
  gui.add(params, 'supportBlock')
  gui.add(params, 'entity', mcData.entitiesArray.map(b => b.name)).listen()
  gui.add(params, 'removeEntity')
  gui.add(params, 'entityRotate')
  gui.add(params, 'skip')
  gui.open(false)
  let folder = gui.addFolder('metadata')

  const Chunk = ChunkLoader(version)
  const Block = BlockLoader(version)
  // const data = await fetch('smallhouse1.schem').then(r => r.arrayBuffer())
  // const schem = await Schematic.read(Buffer.from(data), version)

  const viewDistance = 1
  const center = new Vec3(0, 90, 0)

  const World = WorldLoader(version)

  // const diamondSquare = require('diamond-square')({ version, seed: Math.floor(Math.random() * Math.pow(2, 31)) })
  const targetBlockPos = center
  const world = new World((chunkX, chunkZ) => {
    //@ts-ignore
    return new Chunk()
  })

  // await schem.paste(world, new Vec3(0, 60, 0))

  const worldView = new WorldView(world, viewDistance, center)

  // Create three.js context, add to page
  const renderer = new THREE.WebGLRenderer()
  renderer.setPixelRatio(window.devicePixelRatio || 1)
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  // Create viewer
  const viewer = new Viewer(renderer)
  viewer.setVersion(version)
  viewer.listen(worldView)
  // Initialize viewer, load chunks
  worldView.init(center)
  window['worldView'] = worldView
  window['viewer'] = viewer


  // const controls = new MapControls(viewer.camera, renderer.domElement)
  // controls.update()

  const cameraPos = center.offset(2, 2, 2)
  const pitch = THREE.MathUtils.degToRad(-45)
  const yaw = THREE.MathUtils.degToRad(45)
  viewer.camera.rotation.set(pitch, yaw, 0, 'ZYX')
  viewer.camera.position.set(cameraPos.x + 0.5, cameraPos.y + 0.5, cameraPos.z + 0.5)

  let blockProps = {}
  const getBlock  = () => {
    return mcData.blocksByName[params.block || 'air']
  }
  const onUpdate = {
    block() {
      const {states} = mcData.blocksByStateId[getBlock()?.minStateId] ?? {}
      folder.destroy()
      if (!states) {
        return
      }
      folder = gui.addFolder('metadata')
      for (const state of states) {
        let defaultValue
        switch (state.type) {
          case 'enum':
            defaultValue = state.values[0]
            break;
          case 'bool':
            defaultValue = false
            break;
          case 'int':
            defaultValue = 0
            break;
          case 'direction':
            defaultValue = 'north'
            break;

          default:
            continue
        }
        blockProps[state.name] = defaultValue
        if (state.type === 'enum') {
          folder.add(blockProps, state.name, state.values)
        } else {
          folder.add(blockProps, state.name)
        }
      }
      folder.open()
    },
    entity () {
      viewer.entities.clear()
      if (!params.entity) return
      worldView.emit('entity', {
        id: 'id', name: params.entity, pos: targetBlockPos.offset(0, 1, 0), width: 1, height: 1, username: 'username'
      })
    }
  }


  const applyChanges = () => {
    //@ts-ignore
    const block = Block.fromProperties(getBlock()?.id ?? -1, blockProps, 0)
    viewer.setBlockStateId(targetBlockPos, block.stateId)
    console.log('up', block.stateId)
    params.metadata = block.metadata
    metadataGui.updateDisplay()
    viewer.setBlockStateId(targetBlockPos.offset(0, -1, 0), params.supportBlock ? 1 : 0)
    setQs()
  }
  gui.onChange(({property}) => {
    onUpdate[property]?.()
    applyChanges()
  })
  viewer.waitForChunksToRender().then(async () => {
    await new Promise(resolve => {
      setTimeout(resolve, 0)
    })
    for (const update of Object.values(onUpdate)) {
      update()
    }
    applyChanges()
    gui.openAnimated()
  })

  // Browser animation loop
  const animate = () => {
    // if (controls) controls.update()
    // worldView.updatePosition(controls.target)
    viewer.update()
    renderer.render(viewer.scene, viewer.camera)
    // window.requestAnimationFrame(animate)
  }
  viewer.world.renderUpdateEmitter.addListener('update', () => {
    animate()
  })
  animate()

  setTimeout(() => {
    // worldView.emit('entity', {
    //   id: 'id', name: 'player', pos: center.offset(1, -2, 0), width: 1, height: 1, username: 'username'
    // })
  }, 1500)
}
main()
