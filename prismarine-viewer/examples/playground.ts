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
import Stats from 'stats.js'

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

const stats = new Stats()
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

  const program = createProgram(gl, VertShader, FragShader)
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000)

  let vertices = new Float32Array([
    -0.5, -0.5, -0.5, 0.0, 0.0,
    0.5, -0.5, -0.5, 1.0, 0.0,
    0.5, 0.5, -0.5, 1.0, 1.0,
    0.5, 0.5, -0.5, 1.0, 1.0,
    -0.5, 0.5, -0.5, 0.0, 1.0,
    -0.5, -0.5, -0.5, 0.0, 0.0,

    -0.5, -0.5, 0.5, 0.0, 0.0,
    0.5, -0.5, 0.5, 1.0, 0.0,
    0.5, 0.5, 0.5, 1.0, 1.0,
    0.5, 0.5, 0.5, 1.0, 1.0,
    -0.5, 0.5, 0.5, 0.0, 1.0,
    -0.5, -0.5, 0.5, 0.0, 0.0,

    -0.5, 0.5, 0.5, 1.0, 0.0,
    -0.5, 0.5, -0.5, 1.0, 1.0,
    -0.5, -0.5, -0.5, 0.0, 1.0,
    -0.5, -0.5, -0.5, 0.0, 1.0,
    -0.5, -0.5, 0.5, 0.0, 0.0,
    -0.5, 0.5, 0.5, 1.0, 0.0,

    0.5, 0.5, 0.5, 1.0, 0.0,
    0.5, 0.5, -0.5, 1.0, 1.0,
    0.5, -0.5, -0.5, 0.0, 1.0,
    0.5, -0.5, -0.5, 0.0, 1.0,
    0.5, -0.5, 0.5, 0.0, 0.0,
    0.5, 0.5, 0.5, 1.0, 0.0,

    -0.5, -0.5, -0.5, 0.0, 1.0,
    0.5, -0.5, -0.5, 1.0, 1.0,
    0.5, -0.5, 0.5, 1.0, 0.0,
    0.5, -0.5, 0.5, 1.0, 0.0,
    -0.5, -0.5, 0.5, 0.0, 0.0,
    -0.5, -0.5, -0.5, 0.0, 1.0,

    -0.5, 0.5, -0.5, 0.0, 1.0,
    0.5, 0.5, -0.5, 1.0, 1.0,
    0.5, 0.5, 0.5, 1.0, 0.0,
    0.5, 0.5, 0.5, 1.0, 0.0,
    -0.5, 0.5, 0.5, 0.0, 0.0,
    -0.5, 0.5, -0.5, 0.0, 1.0
  ])

  let CubePositions = [] as any

  //write random coordinates to cube positions xyz ten cubes;
  for (let i = 0; i < 100_000; i++) {
    let x = Math.random() * 100 - 50;
    let y = Math.random() * 100 - 50;
    let z = Math.random() * 100 - 100;
    CubePositions.push([x, y, z]);
  }

  let VBO, VAO = gl.createVertexArray();
  VBO = gl.createBuffer();
  //EBO = gl.createBuffer();

  gl.bindVertexArray(VAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, VBO)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

  //gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, EBO)
  //gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * 4, 0)
  gl.enableVertexAttribArray(0)

  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * 4, 3 * 4)
  gl.enableVertexAttribArray(1)

  //gl.vertexAttribPointer(2,2,gl.FLOAT, false, 8*4 , 6*4)
  //gl.enableVertexAttribArray(2)


  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindVertexArray(null)

  let image = new Image();
  // simple black white chess image 10x10
  image.src = Dirt
  let image2 = new Image();
  // simple black white chess image 10x10
  image2.src = '/textures/1.18.1.png'

  console.log(image.src)
  await new Promise((resolve) => {
    image.onload = resolve
  })
  await new Promise((resolve) => {
    image2.onload = resolve
  })

  let pitch = 0, yaw = 0;
  let x = 0, y = 0, z = 0;

  const keys = (e) => {
    const code = e.code
    const pressed = e.type === 'keydown'
    if (pressed) {
      if (code === 'KeyW') {
        z--;
      }
      if (code === 'KeyS') {
        z++;
      }
      if (code === 'KeyA') {
        x--;
      }
      if (code === 'KeyD') {
        x++;
      }
    }
  }
  window.addEventListener('keydown', keys)
  window.addEventListener('keyup', keys)

  // mouse
  const mouse = { x: 0, y: 0 }
  const mouseMove = (e) => {
    if (e.buttons === 1) {
      yaw += e.movementY/20;
      pitch += e.movementX/20;
    }
  }
  window.addEventListener('mousemove', mouseMove)

  const viewer = new Viewer(null as any | null, 1)
  globalThis.viewer = viewer
  viewer.world.texturesVersion = ('1.18.1')
  viewer.world.updateTexturesData()
  await new Promise(resolve => {
    // console.log('viewer.world.material.map!.image', viewer.world.material.map!.image)
    // viewer.world.material.map!.image.onload = () => {
    //   console.log(this.material.map!.image)
    //   resolve()
    // }
    viewer.world.renderUpdateEmitter.once('blockStatesDownloaded', resolve)
  })
  console.log(viewer.world.downloadedBlockStatesData)
  const names = Object.keys(viewer.world.downloadedBlockStatesData)

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
  gl.enable(gl.DEPTH_TEST)
  //gl.generateMipmap()
  //gl.enable(gl)
  //gl.clearColor(0, 0, 0, 1)
  //gl.clear(gl.COLOR_BUFFER_BIT)
  document.body.appendChild(canvas)

  let view = m4.lookAt([0, 0, 2], [0, 0, 0], [0, 1, 0])
  const projection = m4.perspective(75 * Math.PI / 180, gl.canvas.width / gl.canvas.height, 0.1, 512)
  // view = m4.identity();
  // m4.rotateX(view, yaw * Math.PI / 180)
  // m4.rotateY(view, pitch * Math.PI / 180)
  // m4.translate(view, [x,y,z], view)
  let ModelUniform = gl.getUniformLocation(program, "model")
  let uvUniform = gl.getUniformLocation(program, "uv");
  let ViewUniform = gl.getUniformLocation(program, "view")
  let ProjectionUniform = gl.getUniformLocation(program, "projection")

  // stats.addPanel(new Stats.Panel('FPS', '#0ff', '#002'))
  document.body.appendChild(stats.dom)
  const loop = (performance) => {
    stats.begin()
    gl.canvas.width = window.innerWidth * window.devicePixelRatio
    gl.canvas.height = window.innerHeight * window.devicePixelRatio
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    view = m4.identity();
    m4.rotateX(view, yaw * Math.PI / 180, view)
    m4.rotateY(view, pitch * Math.PI / 180, view)
    m4.translate(view, [x,y,z], view)

    gl.clearColor(0.1, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.clear(gl.DEPTH_BUFFER_BIT)

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture2);

    gl.useProgram(program)

    gl.uniformMatrix4fv(ViewUniform, false, view);
    gl.uniformMatrix4fv(ProjectionUniform, false, projection);



    gl.bindVertexArray(VAO)


    let i = 0
    CubePositions.forEach((cubePosition) => {
      const model = m4.identity()

      m4.translate(model, [cubePosition[0], cubePosition[1], cubePosition[2]], model);
      //m4.rotateX(model, performance / 1000*i/800 + Math.random() / 100, model);
      //m4.rotateY(model, performance / 2500*i/800 + Math.random() / 100, model)
      //m4.rotateZ(model, Math.random() / 1010, model)
      gl.uniformMatrix4fv(ModelUniform, false, model);
      gl.uniform2fv(uvUniform, [i%64 * 1/64,parseInt(i/64) * 1/64]);

      // let result
      // i %= names.length / 2
      // for (const name of ['stone']) {
      //   result = viewer.world.downloadedBlockStatesData[name]?.variants?.['']?.[0]?.model?.elements?.[0]?.faces?.north?.texture
      //   i++
      //   if (result) break
      // }
      // const
      // const tileSize = image.width
      // const blocks =
      // result = {
      //   v: 3*1/64,
      //   u: 4*1/64
      // }

      i++
      i %= 800;


      gl.drawArrays(gl.TRIANGLES, 0, 36);
    })
    ///model.translate([0, 0, 0], model)

    requestAnimationFrame(loop)
    //gl.Swa
    stats.end()
  }
  loop(performance.now)

  // gl.deleteVertexArray(VAO);
  // gl.deleteBuffer(VBO)
  // gl.deleteBuffer(EBO)
  // gl.deleteProgram(program)

  return

  // Create viewer

  viewer.listen(worldView)
  // Load chunks
  await worldView.init(targetPos)
  window['worldView'] = worldView
  window['viewer'] = viewer

  function degrees_to_radians(degrees) {
    var pi = Math.PI;
    return degrees * (pi / 180);
  }

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
