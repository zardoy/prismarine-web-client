import _ from 'lodash'
import { WorldDataEmitter, Viewer, MapControls } from '../viewer'
import { Vec3 } from 'vec3'
import { Schematic } from 'prismarine-schematic'
import BlockLoader from 'prismarine-block'
import ChunkLoader from 'prismarine-chunk'
import WorldLoader from 'prismarine-world'
import * as THREE from 'three'
import { GUI } from 'lil-gui'
import { toMajor } from '../viewer/lib/version'
import { loadScript } from '../viewer/lib/utils'
import JSZip from 'jszip'
import { TWEEN_DURATION } from '../viewer/lib/entities'
import Entity from '../viewer/lib/entity/Entity'
// import * as Mathgl from 'math.gl'
import { m4 } from 'twgl.js'

//@ts-ignore
import Dirt from 'minecraft-assets/minecraft-assets/data/1.17.1/blocks/dirt.png'
//@ts-ignore
import Stone from 'minecraft-assets/minecraft-assets/data/1.17.1/blocks/stone.png'

//@ts-ignore
import VertShader from './_VertexShader.vert'
//@ts-ignore
import FragShader from './_FragmentShader.frag'

globalThis.THREE = THREE
//@ts-ignore
require('three/examples/js/controls/OrbitControls')

const gui = new GUI()

// initial values
const params = {
  skip: '',
  version: globalThis.includedVersions.sort((a, b) => {
    const s = (x) => {
      const parts = x.split('.')
      return +parts[0] + (+parts[1])
    }
    return s(a) - s(b)
  }).at(-1),
  block: '',
  metadata: 0,
  supportBlock: false,
  entity: '',
  removeEntity() {
    this.entity = ''
  },
  entityRotate: false,
  camera: '',
  playSound() { },
  blockIsomorphicRenderBundle() { }
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

let ignoreResize = false

async function main() {
  let continuousRender = false

  const { version } = params
  // temporary solution until web worker is here, cache data for faster reloads
  const globalMcData = window['mcData']
  if (!globalMcData['version']) {
    const major = toMajor(version)
    const sessionKey = `mcData-${major}`
    if (sessionStorage[sessionKey]) {
      Object.assign(globalMcData, JSON.parse(sessionStorage[sessionKey]))
    } else {
      if (sessionStorage.length > 1) sessionStorage.clear()
      await loadScript(`./mc-data/${major}.js`)
      try {
        sessionStorage[sessionKey] = JSON.stringify(Object.fromEntries(Object.entries(globalMcData).filter(([ver]) => ver.startsWith(major))))
      } catch { }
    }
  }

  const mcData = require('minecraft-data')(version)
  window['loadedData'] = mcData

  gui.add(params, 'version', globalThis.includedVersions)
  gui.add(params, 'block', mcData.blocksArray.map(b => b.name).sort((a, b) => a.localeCompare(b)))
  const metadataGui = gui.add(params, 'metadata')
  gui.add(params, 'supportBlock')
  gui.add(params, 'entity', mcData.entitiesArray.map(b => b.name).sort((a, b) => a.localeCompare(b))).listen()
  gui.add(params, 'removeEntity')
  gui.add(params, 'entityRotate')
  gui.add(params, 'skip')
  gui.add(params, 'playSound')
  gui.add(params, 'blockIsomorphicRenderBundle')
  gui.open(false)
  let metadataFolder = gui.addFolder('metadata')
  // let entityRotationFolder = gui.addFolder('entity metadata')

  const Chunk = ChunkLoader(version)
  const Block = BlockLoader(version)
  // const data = await fetch('smallhouse1.schem').then(r => r.arrayBuffer())
  // const schem = await Schematic.read(Buffer.from(data), version)

  const viewDistance = 0
  const targetPos = new Vec3(2, 90, 2)

  const World = WorldLoader(version)

  // const diamondSquare = require('diamond-square')({ version, seed: Math.floor(Math.random() * Math.pow(2, 31)) })

  //@ts-ignore
  const chunk1 = new Chunk()
  //@ts-ignore
  const chunk2 = new Chunk()
  chunk1.setBlockStateId(targetPos, 34)
  chunk2.setBlockStateId(targetPos.offset(1, 0, 0), 34)
  const world = new World((chunkX, chunkZ) => {
    // if (chunkX === 0 && chunkZ === 0) return chunk1
    // if (chunkX === 1 && chunkZ === 0) return chunk2
    //@ts-ignore
    const chunk = new Chunk()
    return chunk
  })

  // await schem.paste(world, new Vec3(0, 60, 0))

  const worldView = new WorldDataEmitter(world, viewDistance, targetPos)

  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2')!

  const program = createProgram(gl,VertShader, FragShader)
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

  let vertices = new Float32Array([
    0.5,  0.5, 0.0,   1.0, 0.0, 0.0,   1.0, 1.0, // top right
    0.5, -0.5, 0.0,   0.0, 1.0, 0.0,   1.0, 0.0, // bottom right
   -0.5, -0.5, 0.0,   0.0, 0.0, 1.0,   0.0, 0.0, // bottom left
   -0.5,  0.5, 0.0,   1.0, 1.0, 0.0,   0.0, 1.0
  ])
  let indices = new Uint8Array([  // note that we start from 0!
    0, 1, 3,  // first Triangle
    1, 2, 3   // second Triangle
  ])
  let VBO, VAO, EBO
  VAO = gl.createVertexArray();
  VBO = gl.createBuffer();
  EBO = gl.createBuffer();

  gl.bindVertexArray(VAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, VBO)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, EBO)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

  //new THREE.BufferAttribute(vertices, 3)

  gl.vertexAttribPointer(0,3,gl.FLOAT, false,  8 * 4, 0)
  gl.enableVertexAttribArray(0)

  gl.vertexAttribPointer(1,3,gl.FLOAT, false,  8*4, 3*4)
  gl.enableVertexAttribArray(1)

  gl.vertexAttribPointer(2,2,gl.FLOAT, false, 8*4 , 6*4)
  gl.enableVertexAttribArray(2)


  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindVertexArray(null)

  let image = new Image();
  // simple black white chess image 10x10
  image.src = Dirt
  let image2 = new Image();
  // simple black white chess image 10x10
  image2.src = Stone

  console.log(image.src)
  await new Promise((resolve) => {
    image.onload = resolve
  })
  await new Promise((resolve) => {
    image2.onload = resolve
  })

  let texture1 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture1);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);	// set texture wrapping to GL_REPEAT (default wrapping method)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  //.tset texture fgl.ering paramegl.s
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, image.width, image.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image);
  //gl.generateMipmap(gl.TEXTURE_2D);

  let texture2 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture2);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);	// set texture wrapping to GL_REPEAT (default wrapping method)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  //.tset texture fgl.ering paramegl.s
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, image2.width, image2.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image2);
  //gl.generateMipmap(gl.TEXTURE_2D);

  gl.useProgram(program)

  gl.uniform1i(gl.getUniformLocation(program, "texture1"), 0);
  gl.uniform1i(gl.getUniformLocation(program, "texture2"), 1);

  //gl.attachShader(program, program)

  //gl.clearColor(0, 0, 0, 1)
  //gl.clear(gl.COLOR_BUFFER_BIT)
  document.body.appendChild(canvas)

  const loop = (performance) => {
    gl.canvas.width = window.innerWidth
    gl.canvas.height = window.innerHeight
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    gl.clearColor(0.1, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture2);

    const view = m4.lookAt([0, 0, 2], [0, 0, 0], [0, 1, 0])
    const projection = m4.perspective(45 * Math.PI / 180, gl.canvas.width / gl.canvas.height, 0.1, 100)
    const model = m4.identity()
    m4.rotateX(model, performance / 1000, model);
    m4.rotateY(model, performance / 2500, model)
    m4.translate(view, [0, 0, -10], view)



    //let transform = m4.identity()
    // transform = m4.translate(transform, [0.5, 0.5, 0.0], transform)
    //m4.axisRotate(transform, [0,1.0,0.0], performance/100, transform)

    // glm::mat4 transform = glm::mat4(1.0f); // make sure to initialize matrix to identity matrix first
    //transform = glm::translate(transform, glm::vec3(0.5f, -0.5f, 0.0f));
    //transform = glm::rotate(transform, (float)glfwGetTime(), glm::vec3(0.0f, 0.0f, 1.0f));
    //gl.uniformMatrix4fv(gl.getUniformLocation(program, "transform"), false, transform);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projection"), false, projection);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "model"), false, model);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "view"), false, view);
    gl.useProgram(program)
    gl.bindVertexArray(VAO)
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);


    requestAnimationFrame(loop)
    //gl.Swa
  }
  loop(performance.now)

  // gl.deleteVertexArray(VAO);
  // gl.deleteBuffer(VBO)
  // gl.deleteBuffer(EBO)
  // gl.deleteProgram(program)

  return

  // Create viewer
  const viewer = new Viewer(null as  any | null, 1)

  viewer.listen(worldView)
  // Load chunks
  await worldView.init(targetPos)
  window['worldView'] = worldView
  window['viewer'] = viewer

  function degrees_to_radians(degrees)
{
  var pi = Math.PI;
  return degrees * (pi/180);
}

  // params.blockIsomorphicRenderBundle = () => {
  //   const canvas = renderer.domElement
  //   const onlyCurrent = !confirm('Ok - render all blocks, Cancel - render only current one')
  //   const sizeRaw = prompt('Size', '512')
  //   if (!sizeRaw) return
  //   const size = parseInt(sizeRaw)
  //   // const size = 512

  //   ignoreResize = true
  //   canvas.width = size
  //   canvas.height = size
  //   renderer.setSize(size, size)

  //   //@ts-ignore
  //   viewer.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10)
  //   viewer.scene.background = null

  //   const rad = THREE.MathUtils.degToRad(-120)
  //   viewer.directionalLight.position.set(
  //     Math.cos(rad),
  //     Math.sin(rad),
  //     0.2
  //   ).normalize()
  //   viewer.directionalLight.intensity = 1

  //   const cameraPos = targetPos.offset(2, 2, 2)
  //   const pitch = THREE.MathUtils.degToRad(-30)
  //   const yaw = THREE.MathUtils.degToRad(45)
  //   viewer.camera.rotation.set(pitch, yaw, 0, 'ZYX')
  //   // viewer.camera.lookAt(center.x + 0.5, center.y + 0.5, center.z + 0.5)
  //   viewer.camera.position.set(cameraPos.x + 1, cameraPos.y + 0.5, cameraPos.z + 1)

  //   const allBlocks = mcData.blocksArray.map(b => b.name)
  //   // const allBlocks = ['stone', 'warped_slab']

  //   let blockCount = 1
  //   let blockName = allBlocks[0]

  //   const updateBlock = () => {

  //     //@ts-ignore
  //     // viewer.setBlockStateId(targetPos, mcData.blocksByName[blockName].minStateId)
  //     params.block = blockName
  //     // todo cleanup (introduce getDefaultState)
  //     onUpdate.block()
  //     applyChanges(false, true)
  //   }
  //   viewer.waitForChunksToRender().then(async () => {
  //     // wait for next macro task
  //     await new Promise(resolve => {
  //       setTimeout(resolve, 0)
  //     })
  //     if (onlyCurrent) {
  //       viewer.render()
  //       onWorldUpdate()
  //     } else {
  //       // will be called on every render update
  //       viewer.world.renderUpdateEmitter.addListener('update', onWorldUpdate)
  //       updateBlock()
  //     }
  //   })

  //   const zip = new JSZip()
  //   zip.file('description.txt', 'Generated with prismarine-viewer')

  //   const end = async () => {
  //     // download zip file

  //     const a = document.createElement('a')
  //     const blob = await zip.generateAsync({ type: 'blob' })
  //     const dataUrlZip = URL.createObjectURL(blob)
  //     a.href = dataUrlZip
  //     a.download = 'blocks_render.zip'
  //     a.click()
  //     URL.revokeObjectURL(dataUrlZip)
  //     console.log('end')

  //     viewer.world.renderUpdateEmitter.removeListener('update', onWorldUpdate)
  //   }

  //   async function onWorldUpdate () {
  //     // await new Promise(resolve => {
  //     //   setTimeout(resolve, 50)
  //     // })
  //     const dataUrl = canvas.toDataURL('image/png')

  //     zip.file(`${blockName}.png`, dataUrl.split(',')[1], { base64: true })

  //     if (onlyCurrent) {
  //       end()
  //     } else {
  //       nextBlock()
  //     }
  //   }
  //   const nextBlock = async () => {
  //     blockName = allBlocks[blockCount++]
  //     console.log(allBlocks.length, '/', blockCount, blockName)
  //     if (blockCount % 5 === 0) {
  //       await new Promise(resolve => {
  //         setTimeout(resolve, 100)
  //       })
  //     }
  //     if (blockName) {
  //       updateBlock()
  //     } else {
  //       end()
  //     }
  //   }
  // }

  // const jsonData = await fetch('https://bluecolored.de/bluemap/maps/overworld/tiles/0/x-2/2/z1/6.json?584662').then(r => r.json())

  // const uniforms = {
  //   distance: { value: 0 },
  //   sunlightStrength: { value: 1 },
  //   ambientLight: { value: 0 },
  //   skyColor: { value: new THREE.Color(0.5, 0.5, 1) },
  //   voidColor: { value: new THREE.Color(0, 0, 0) },
  //   hiresTileMap: {
  //     value: {
  //       map: null,
  //       size: 100,
  //       scale: new THREE.Vector2(1, 1),
  //       translate: new THREE.Vector2(),
  //       pos: new THREE.Vector2(),
  //     }
  //   }

  // }

  // const shader1 = new THREE.ShaderMaterial({
  //   uniforms: uniforms,
  //   vertexShader: [0, 0, 0, 0],
  //   fragmentShader: fragmentShader,
  //   transparent: false,
  //   depthWrite: true,
  //   depthTest: true,
  //   vertexColors: true,
  //   side: THREE.FrontSide,
  //   wireframe: false
  // })


  //@ts-ignore
  const controls = new globalThis.THREE.OrbitControls(viewer.camera, renderer.domElement)
  viewer.camer
  controls.target.set(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)

  const cameraPos = targetPos.offset(2, 2, 2)
  const pitch = THREE.MathUtils.degToRad(-45)
  const yaw = THREE.MathUtils.degToRad(45)
  viewer.camera.rotation.set(pitch, yaw, 0, 'ZYX')
  viewer.camera.lookAt(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)
  viewer.camera.position.set(cameraPos.x + 0.5, cameraPos.y + 0.5, cameraPos.z + 0.5)
  controls.update()

  let blockProps = {}
  let entityOverrides = {}
  const getBlock = () => {
    return mcData.blocksByName[params.block || 'air']
  }

  const entityUpdateShared = () => {
    viewer.entities.clear()
    if (!params.entity) return
    worldView.emit('entity', {
      id: 'id', name: params.entity, pos: targetPos.offset(0.5, 1, 0.5), width: 1, height: 1, username: localStorage.testUsername, yaw: Math.PI, pitch: 0
    })
    const enableSkeletonDebug = (obj) => {
      const { children, isSkeletonHelper } = obj
      if (!Array.isArray(children)) return
      if (isSkeletonHelper) {
        obj.visible = true
        return
      }
      for (const child of children) {
        if (typeof child === 'object') enableSkeletonDebug(child)
      }
    }
    enableSkeletonDebug(viewer.entities.entities['id'])
    setTimeout(() => {
      viewer.update()
      viewer.render()
    }, TWEEN_DURATION)
  }

  const onUpdate = {
    block() {
      metadataFolder.destroy()
      const block = mcData.blocksByName[params.block]
      if (!block) return
      const props = new Block(block.id, 0, 0).getProperties()
      //@ts-ignore
      const { states } = mcData.blocksByStateId[getBlock()?.minStateId] ?? {}
      metadataFolder = gui.addFolder('metadata')
      if (states) {
        for (const state of states) {
          let defaultValue
          switch (state.type) {
            case 'enum':
              defaultValue = state.values[0]
              break
            case 'bool':
              defaultValue = false
              break
            case 'int':
              defaultValue = 0
              break
            case 'direction':
              defaultValue = 'north'
              break

            default:
              continue
          }
          blockProps[state.name] = defaultValue
          if (state.type === 'enum') {
            metadataFolder.add(blockProps, state.name, state.values)
          } else {
            metadataFolder.add(blockProps, state.name)
          }
        }
      } else {
        for (const [name, value] of Object.entries(props)) {
          blockProps[name] = value
          metadataFolder.add(blockProps, name)
        }
      }
      metadataFolder.open()
    },
    entity() {
      continuousRender = params.entity === 'player'
      entityUpdateShared()
      if (!params.entity) return
      if (params.entity === 'player') {
        viewer.entities.updatePlayerSkin('id', viewer.entities.entities.id.username, true, true)
        viewer.entities.playAnimation('id', 'running')
      }
      // let prev = false
      // setInterval(() => {
      //   viewer.entities.playAnimation('id', prev ? 'running' : 'idle')
      //   prev = !prev
      // }, 1000)

      Entity.getStaticData(params.entity)
      // entityRotationFolder.destroy()
      // entityRotationFolder = gui.addFolder('entity metadata')
      // entityRotationFolder.add(params, 'entityRotate')
      // entityRotationFolder.open()
    },
    supportBlock() {
      viewer.setBlockStateId(targetPos.offset(0, -1, 0), params.supportBlock ? 1 : 0)
    }
  }


  const applyChanges = (metadataUpdate = false, skipQs = false) => {
    const blockId = getBlock()?.id
    let block: BlockLoader.Block
    if (metadataUpdate) {
      block = new Block(blockId, 0, params.metadata)
      Object.assign(blockProps, block.getProperties())
      for (const _child of metadataFolder.children) {
        const child = _child as import('lil-gui').Controller
        child.updateDisplay()
      }
    } else {
      try {
        //@ts-ignore
        block = Block.fromProperties(blockId ?? -1, blockProps, 0)
      } catch (err) {
        console.error(err)
        block = Block.fromStateId(0, 0)
      }
    }

    //@ts-ignore
    viewer.setBlockStateId(targetPos, block.stateId)
    console.log('up stateId', block.stateId)
    params.metadata = block.metadata
    metadataGui.updateDisplay()
    if (!skipQs) {
      setQs()
    }
  }
  gui.onChange(({ property, object }) => {
    if (object === params) {
      if (property === 'camera') return
      onUpdate[property]?.()
      applyChanges(property === 'metadata')
    } else {
      applyChanges()
    }
  })
  viewer.waitForChunksToRender().then(async () => {
    await new Promise(resolve => {
      setTimeout(resolve, 0)
    })
    for (const update of Object.values(onUpdate)) {
      update()
    }
    applyChanges(true)
    gui.openAnimated()
  })

  const animate = () => {
    // if (controls) controls.update()
    // worldView.updatePosition(controls.target)
    viewer.update()
    viewer.render()
    // window.requestAnimationFrame(animate)
  }
  viewer.world.renderUpdateEmitter.addListener('update', () => {
    animate()
  })
  animate()

  // #region camera rotation param
  if (params.camera) {
    const [x, y] = params.camera.split(',')
    viewer.camera.rotation.set(parseFloat(x), parseFloat(y), 0, 'ZYX')
    controls.update()
    console.log(viewer.camera.rotation.x, parseFloat(x))
  }
  const throttledCamQsUpdate = _.throttle(() => {
    const { camera } = viewer
    // params.camera = `${camera.rotation.x.toFixed(2)},${camera.rotation.y.toFixed(2)}`
    setQs()
  }, 200)
  controls.addEventListener('change', () => {
    throttledCamQsUpdate()
    animate()
  })
  // #endregion

  const continuousUpdate = () => {
    if (continuousRender) {
      animate()
    }
    requestAnimationFrame(continuousUpdate)
  }
  continuousUpdate()

  window.onresize = () => {
    if (ignoreResize) return
    // const vec3 = new THREE.Vector3()
    // vec3.set(-1, -1, -1).unproject(viewer.camera)
    // console.log(vec3)
    // box.position.set(vec3.x, vec3.y, vec3.z-1)

    const { camera } = viewer
    viewer.camera.aspect = window.innerWidth / window.innerHeight
    viewer.camera.updateProjectionMatrix()
    // renderer.setSize(window.innerWidth, window.innerHeight)

    animate()
  }
  window.dispatchEvent(new Event('resize'))

  params.playSound = () => {
    viewer.playSound(targetPos, 'button_click.mp3')
  }
  addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') {
      params.playSound()
    }
  }, { capture: true })
}
main()

export const createProgram = (gl: WebGL2RenderingContext, vertexShader: string, fragmentShader: string) => {
  const createShader = (gl: WebGL2RenderingContext, type: number, source: string) => {
    const shaderName = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    if (!success) {
      const info = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error(`Shader ${shaderName} compile error: ` + info)
    }
    return shader
  }



  const program = gl.createProgram()!
  gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShader)!)
  gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShader)!)
  gl.linkProgram(program)
  const linkSuccess = gl.getProgramParameter(program, gl.LINK_STATUS)
  if (!linkSuccess) {
    const info = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error('Program link error: ' + info)
  }
  return program
}
