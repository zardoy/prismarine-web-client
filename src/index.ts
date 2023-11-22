/* eslint-disable import/order */
import './importsWorkaround'
import './styles.css'
import './globals'
import 'iconify-icon'
import './chat'
import './getCollisionShapes'
import { onGameLoad } from './playerWindows'

import './menus/components/button'
import './menus/components/edit_box'
import './menus/components/hotbar'
import './menus/components/health_bar'
import './menus/components/food_bar'
import './menus/components/breath_bar'
import './menus/components/debug_overlay'
import './menus/components/playerlist_overlay'
import './menus/components/bossbars_overlay'
import './menus/hud'
import './menus/play_screen'
import './menus/pause_screen'
import './menus/keybinds_screen'
import { initWithRenderer, statsEnd, statsStart } from './topRightStats'
import PrismarineBlock from 'prismarine-block'

import { options, watchValue } from './optionsStorage'
import './reactUi.jsx'
import { contro, onBotCreate } from './controls'
import './dragndrop'
import { possiblyCleanHandle } from './browserfs'
import './eruda'
import { watchOptionsAfterViewerInit } from './watchOptions'
import downloadAndOpenFile from './downloadAndOpenFile'

import fs from 'fs'
import net from 'net'
import mineflayer from 'mineflayer'
import { WorldDataEmitter, Viewer } from 'prismarine-viewer/viewer'
import pathfinder from 'mineflayer-pathfinder'
import { Vec3 } from 'vec3'

import worldInteractions from './worldInteractions'

import * as THREE from 'three'
import MinecraftData, { versionsByMinecraftVersion } from 'minecraft-data'

import { initVR } from './vr'
import {
  activeModalStack,
  showModal, activeModalStacks,
  insertActiveModalStack,
  isGameActive,
  miscUiState, resetStateAfterDisconnect,
  notification
} from './globalState'

import {
  pointerLock, isCypress,
  toMajorVersion,
  setLoadingScreenStatus,
  setRenderDistance
} from './utils'

import {
  removePanorama
} from './panorama'

import { startLocalServer, unsupportedLocalServerFeatures } from './createLocalServer'
import defaultServerOptions from './defaultLocalServerOptions'
import dayCycle from './dayCycle'

import _ from 'lodash-es'

import { genTexturePackTextures, watchTexturepackInViewer } from './texturePack'
import { connectToPeer } from './localServerMultiplayer'
import CustomChannelClient from './customClient'
import debug from 'debug'
import { loadScript } from 'prismarine-viewer/viewer/lib/utils'
import { registerServiceWorker } from './serviceWorker'
import { appStatusState } from './react/AppStatusProvider'

import { fsState } from './loadSave'
import { watchFov } from './rendererUtils'
import { loadInMemorySave } from './react/SingleplayerProvider'

window.debug = debug
window.THREE = THREE

// ACTUAL CODE

void registerServiceWorker()
watchFov()

// Create three.js context, add to page
const renderer = new THREE.WebGLRenderer({
  powerPreference: options.highPerformanceGpu ? 'high-performance' : 'default',
})
initWithRenderer(renderer.domElement)
window.renderer = renderer
renderer.setPixelRatio(window.devicePixelRatio || 1) // todo this value is too high on ios, need to check, probably we should use avg, also need to make it configurable
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.domElement.id = 'viewer-canvas'
document.body.appendChild(renderer.domElement)

// Create viewer
const viewer: import('prismarine-viewer/viewer/lib/viewer').Viewer = new Viewer(renderer, options.numWorkers)
window.viewer = viewer
Object.defineProperty(window, 'debugSceneChunks', {
  get () {
    return viewer.world.getLoadedChunksRelative(bot.entity.position)
  },
})
viewer.entities.entitiesOptions = {
  fontFamily: 'mojangles'
}
watchOptionsAfterViewerInit()
watchTexturepackInViewer(viewer)

let renderInterval: number | false
watchValue(options, (o) => {
  renderInterval = o.frameLimit && 1000 / o.frameLimit
})

let postRenderFrameFn = () => { }
let delta = 0
let lastTime = performance.now()
let previousWindowWidth = window.innerWidth
let previousWindowHeight = window.innerHeight
let max = 0
let rendered = 0
const renderFrame = (time: DOMHighResTimeStamp) => {
  if (window.stopLoop) return
  window.requestAnimationFrame(renderFrame)
  if (window.stopRender || renderer.xr.isPresenting) return
  if (renderInterval) {
    delta += time - lastTime
    lastTime = time
    if (delta > renderInterval) {
      delta %= renderInterval
      // continue rendering
    } else {
      return
    }
  }
  // ios bug: viewport dimensions are updated after the resize event
  if (previousWindowWidth !== window.innerWidth || previousWindowHeight !== window.innerHeight) {
    resizeHandler()
    previousWindowWidth = window.innerWidth
    previousWindowHeight = window.innerHeight
  }
  statsStart()
  viewer.update()
  renderer.render(viewer.scene, viewer.camera)
  rendered++
  postRenderFrameFn()
  statsEnd()
}
renderFrame(performance.now())
setInterval(() => {
  if (max > 0) {
    viewer.world.droppedFpsPercentage = rendered / max
  }
  max = Math.max(rendered, max)
  rendered = 0
}, 1000)

const resizeHandler = () => {
  const width = window.innerWidth
  const height = window.innerHeight

  viewer.camera.aspect = width / height
  viewer.camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

const hud = document.getElementById('hud')
const pauseMenu = document.getElementById('pause-screen')

let mouseMovePostHandle = (e) => { }
let lastMouseMove: number
let debugMenu
const updateCursor = () => {
  worldInteractions.update()
  debugMenu ??= hud.shadowRoot.querySelector('#debug-overlay')
  debugMenu.cursorBlock = worldInteractions.cursorBlock
}
function onCameraMove (e) {
  if (e.type !== 'touchmove' && !pointerLock.hasPointerLock) return
  e.stopPropagation?.()
  const now = performance.now()
  // todo: limit camera movement for now to avoid unexpected jumps
  if (now - lastMouseMove < 4) return
  lastMouseMove = now
  let { mouseSensX, mouseSensY } = options
  if (mouseSensY === true) mouseSensY = mouseSensX
  mouseMovePostHandle({
    x: e.movementX * mouseSensX * 0.0001,
    y: e.movementY * mouseSensY * 0.0001
  })
  updateCursor()
}
window.addEventListener('mousemove', onCameraMove, { capture: true })
contro.on('stickMovement', ({ stick, vector }) => {
  if (!isGameActive(true)) return
  if (stick !== 'right') return
  let { x, z } = vector
  if (Math.abs(x) < 0.18) x = 0
  if (Math.abs(z) < 0.18) z = 0
  onCameraMove({ movementX: x * 10, movementY: z * 10, type: 'touchmove' })
  miscUiState.usingGamepadInput = true
})

function hideCurrentScreens () {
  activeModalStacks['main-menu'] = [...activeModalStack]
  insertActiveModalStack('', [])
}

const loadSingleplayer = (serverOverrides = {}, flattenedServerOverrides = {}) => {
  void connect({ singleplayer: true, username: options.localUsername, password: '', serverOverrides, serverOverridesFlat: flattenedServerOverrides })
}
function listenGlobalEvents () {
  const menu = document.getElementById('play-screen')
  menu.addEventListener('connect', e => {
    const options = e.detail
    void connect(options)
  })
  window.addEventListener('singleplayer', (e) => {
    //@ts-expect-error
    loadSingleplayer(e.detail)
  })
}

let listeners = [] as Array<{ target, event, callback }>
// only for dom listeners (no removeAllListeners)
// todo refactor them out of connect fn instead
const registerListener: import('./utilsTs').RegisterListener = (target, event, callback) => {
  target.addEventListener(event, callback)
  listeners.push({ target, event, callback })
}
const removeAllListeners = () => {
  for (const { target, event, callback } of listeners) {
    target.removeEventListener(event, callback)
  }
  listeners = []
}

const cleanConnectIp = (host: string | undefined, defaultPort: string | undefined) => {
  const hostPort = host && /:\d+$/.exec(host)
  if (hostPort) {
    return {
      host: host.slice(0, -hostPort[0].length),
      port: hostPort[0].slice(1)
    }
  } else {
    return { host, port: defaultPort }
  }
}

async function connect (connectOptions: {
  server?: string; singleplayer?: any; username: string; password?: any; proxy?: any; botVersion?: any; serverOverrides?; serverOverridesFlat?; peerId?: string
}) {
  document.getElementById('play-screen').style = 'display: none;'
  removePanorama()

  const { singleplayer } = connectOptions
  const p2pMultiplayer = !!connectOptions.peerId
  miscUiState.singleplayer = singleplayer
  miscUiState.flyingSquid = singleplayer || p2pMultiplayer
  const { renderDistance: renderDistanceSingleplayer, multiplayerRenderDistance } = options
  const server = cleanConnectIp(connectOptions.server, '25565')
  const proxy = cleanConnectIp(connectOptions.proxy, undefined)
  const { username, password } = connectOptions

  console.log(`connecting to ${server.host}:${server.port} with ${username}`)

  hideCurrentScreens()
  setLoadingScreenStatus('Logging in')

  let ended = false
  let bot!: typeof __type_bot
  const destroyAll = () => {
    if (ended) return
    ended = true
    viewer.resetAll()
    localServer = window.localServer = window.server = undefined

    postRenderFrameFn = () => { }
    if (bot) {
      bot.end()
      // ensure mineflayer plugins receive this event for cleanup
      bot.emit('end', '')
      bot.removeAllListeners()
      bot._client.removeAllListeners()
      //@ts-expect-error TODO?
      bot._client = undefined
      //@ts-expect-error
      window.bot = bot = undefined
    }
    if (singleplayer && !fsState.inMemorySave) {
      possiblyCleanHandle(() => {
        // todo: this is not enough, we need to wait for all async operations to finish
      })
    }
    resetStateAfterDisconnect()
    removeAllListeners()
  }
  const handleError = (err) => {
    errorAbortController.abort()
    console.log('Encountered error!', err)

    // #region rejoin key
    const controller = new AbortController()
    window.addEventListener('keyup', (e) => {
      if (e.code !== 'KeyR') return
      controller.abort()
      void connect(connectOptions)
      appStatusState.isError = false
    }, { signal: controller.signal })
    // #endregion

    setLoadingScreenStatus(`Error encountered. ${err}`, true)
    destroyAll()
    if (isCypress()) throw err
  }

  const errorAbortController = new AbortController()
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason.name === 'ServerPluginLoadFailure') {
      if (confirm(`Failed to load server plugin ${e.reason.pluginName} (invoking ${e.reason.pluginMethod}). Continue?`)) {
        return
      }
    }
    handleError(e.reason)
  }, {
    signal: errorAbortController.signal
  })
  window.addEventListener('error', (e) => {
    handleError(e.message)
  }, {
    signal: errorAbortController.signal
  })

  if (proxy) {
    console.log(`using proxy ${proxy.host}${proxy.port && `:${proxy.port}`}`)

    net['setProxy']({ hostname: proxy.host, port: proxy.port })
  }

  const renderDistance = singleplayer ? renderDistanceSingleplayer : multiplayerRenderDistance
  let localServer
  try {
    const serverOptions = _.defaultsDeep({}, connectOptions.serverOverrides ?? {}, options.localServerOptions, defaultServerOptions)
    Object.assign(serverOptions, connectOptions.serverOverridesFlat ?? {})
    const downloadMcData = async (version: string) => {
      setLoadingScreenStatus(`Downloading data for ${version}`)
      await loadScript(`./mc-data/${toMajorVersion(version)}.js`)
      miscUiState.loadedDataVersion = version
      try {
        await genTexturePackTextures(version)
      } catch (err) {
        console.error(err)
        const doContinue = confirm('Failed to apply texture pack. See errors in the console. Continue?')
        if (!doContinue) {
          throw err
        }
      }
      viewer.setVersion(version)
    }

    const downloadVersion = connectOptions.botVersion || (singleplayer ? serverOptions.version : undefined)
    if (downloadVersion) {
      await downloadMcData(downloadVersion)
    }

    if (singleplayer) {
      // SINGLEPLAYER EXPLAINER:
      // Note 1: here we have custom sync communication between server Client (flying-squid) and game client (mineflayer)
      // Note 2: custom Server class is used which simplifies communication & Client creation on it's side
      // local server started
      // mineflayer.createBot (see source def)
      // bot._client = bot._client ?? mc.createClient(options) <-- mc-protocol package
      // tcpDns() skipped since we define connect option
      // in setProtocol: we emit 'connect' here below so in that file we send set_protocol and login_start (onLogin handler)
      // Client (class) of flying-squid (in server/login.js of mc-protocol): onLogin handler: skip most logic & go to loginClient() which assigns uuid and sends 'success' back to client (onLogin handler) and emits 'login' on the server (login.js in flying-squid handler)
      // flying-squid: 'login' -> player.login -> now sends 'login' event to the client (handled in many plugins in mineflayer) -> then 'update_health' is sent which emits 'spawn' in mineflayer

      setLoadingScreenStatus('Starting local server')
      localServer = window.localServer = window.server = startLocalServer(serverOptions)
      // todo need just to call quit if started
      // loadingScreen.maybeRecoverable = false
      // init world, todo: do it for any async plugins
      if (!localServer.pluginsReady) {
        await new Promise(resolve => {
          localServer.once('pluginsReady', resolve)
        })
      }

      localServer.on('newPlayer', (player) => {
        // it's you!
        player.on('loadingStatus', (newStatus) => {
          setLoadingScreenStatus(newStatus, false, false, true)
        })
      })
    }

    let initialLoadingText: string
    if (singleplayer) {
      initialLoadingText = 'Local server is still starting'
    } else if (p2pMultiplayer) {
      initialLoadingText = 'Connecting to peer'
    } else {
      initialLoadingText = 'Connecting to server'
    }
    setLoadingScreenStatus(initialLoadingText)
    bot = mineflayer.createBot({
      host: server.host,
      port: server.port ? +server.port : undefined,
      version: connectOptions.botVersion || false,
      ...p2pMultiplayer ? {
        stream: await connectToPeer(connectOptions.peerId!),
      } : {},
      ...singleplayer || p2pMultiplayer ? {
        keepAlive: false,
      } : {},
      ...singleplayer ? {
        version: serverOptions.version,
        connect () { },
        Client: CustomChannelClient as any,
      } : {},
      username,
      password,
      viewDistance: renderDistance,
      checkTimeoutInterval: 240 * 1000,
      noPongTimeout: 240 * 1000,
      closeTimeout: 240 * 1000,
      respawn: options.autoRespawn,
      async versionSelectedHook (client) {
        // todo keep in sync with esbuild preload, expose cache ideally
        if (client.version === '1.20.1') {
          // ignore cache hit
          versionsByMinecraftVersion.pc['1.20.1']!['dataVersion']++
        }
        await downloadMcData(client.version)
        setLoadingScreenStatus(initialLoadingText)
      }
    }) as unknown as typeof __type_bot
    window.bot = bot
    if (singleplayer || p2pMultiplayer) {
      // in case of p2pMultiplayer there is still flying-squid on the host side
      const _supportFeature = bot.supportFeature
      bot.supportFeature = (feature) => {
        if (unsupportedLocalServerFeatures.includes(feature)) {
          return false
        }
        return _supportFeature(feature)
      }

      bot.emit('inject_allowed')
      bot._client.emit('connect')
    } else {
      const setupConnectHandlers = () => {
        bot._client.socket.on('connect', () => {
          console.log('TCP connection established')
          //@ts-expect-error
          bot._client.socket._ws.addEventListener('close', () => {
            console.log('TCP connection closed')
            setTimeout(() => {
              if (bot) {
                bot.emit('end', 'TCP connection closed with unknown reason')
              }
            })
          })
        })
      }
      // socket setup actually can be delayed because of dns lookup
      if (bot._client.socket) {
        setupConnectHandlers()
      } else {
        const originalSetSocket = bot._client.setSocket.bind(bot._client)
        bot._client.setSocket = (socket) => {
          originalSetSocket(socket)
          setupConnectHandlers()
        }
      }

    }
  } catch (err) {
    handleError(err)
  }
  if (!bot) return

  const p2pConnectTimeout = p2pMultiplayer ? setTimeout(() => { throw new Error('Spawn timeout. There might be error on other side, check console.') }, 20_000) : undefined
  hud.preload(bot)

  // bot.on('inject_allowed', () => {
  //   loadingScreen.maybeRecoverable = false
  // })

  bot.on('error', handleError)

  bot.on('kicked', (kickReason) => {
    console.log('User was kicked!', kickReason)
    setLoadingScreenStatus(`The Minecraft server kicked you. Kick reason: ${kickReason}`, true)
    destroyAll()
  })

  bot.on('end', (endReason) => {
    if (ended) return
    console.log('disconnected for', endReason)
    setLoadingScreenStatus(`You have been disconnected from the server. End reason: ${endReason}`, true)
    destroyAll()
    if (isCypress()) throw new Error(`disconnected: ${endReason}`)
  })

  onBotCreate()

  bot.once('login', () => {
    worldInteractions.init()

    // server is ok, add it to the history
    if (!connectOptions.server) return
    const serverHistory: string[] = JSON.parse(localStorage.getItem('serverHistory') || '[]')
    serverHistory.unshift(connectOptions.server)
    localStorage.setItem('serverHistory', JSON.stringify([...new Set(serverHistory)]))

    setLoadingScreenStatus('Loading world')
  })

  // don't use spawn event, player can be dead
  bot.once('health', () => {
    const mcData = MinecraftData(bot.version)
    window.PrismarineBlock = PrismarineBlock(mcData.version.minecraftVersion!)
    window.loadedData = mcData
    window.Vec3 = Vec3
    window.pathfinder = pathfinder

    miscUiState.gameLoaded = true
    if (p2pConnectTimeout) clearTimeout(p2pConnectTimeout)

    setLoadingScreenStatus('Placing blocks (starting viewer)')

    console.log('bot spawned - starting viewer')

    const center = bot.entity.position

    const worldView = window.worldView = new WorldDataEmitter(bot.world, renderDistance, center)

    bot.on('physicsTick', () => updateCursor())

    const debugMenu = hud.shadowRoot.querySelector('#debug-overlay')

    window.debugMenu = debugMenu

    void initVR()

    postRenderFrameFn = () => {
      viewer.setFirstPersonCamera(null, bot.entity.yaw, bot.entity.pitch)
    }

    try {
      const gl = renderer.getContext()
      debugMenu.rendererDevice = gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')!.UNMASKED_RENDERER_WEBGL)
    } catch (err) {
      console.warn(err)
      debugMenu.rendererDevice = '???'
    }

    // Link WorldDataEmitter and Viewer
    viewer.listen(worldView)
    worldView.listenToBot(bot)
    void worldView.init(bot.entity.position)

    dayCycle()

    // Bot position callback
    function botPosition () {
      viewer.world.lastCamUpdate = Date.now()
      // this might cause lag, but not sure
      viewer.setFirstPersonCamera(bot.entity.position, bot.entity.yaw, bot.entity.pitch)
      void worldView.updatePosition(bot.entity.position)
    }
    bot.on('move', botPosition)
    botPosition()

    setLoadingScreenStatus('Setting callbacks')

    const maxPitch = 0.5 * Math.PI
    const minPitch = -0.5 * Math.PI
    mouseMovePostHandle = ({ x, y }) => {
      viewer.world.lastCamUpdate = Date.now()
      bot.entity.pitch -= y
      bot.entity.pitch = Math.max(minPitch, Math.min(maxPitch, bot.entity.pitch))
      bot.entity.yaw -= x
    }

    function changeCallback () {
      notification.show = false
      if (renderer.xr.isPresenting) return // todo
      if (!pointerLock.hasPointerLock && activeModalStack.length === 0) {
        showModal(pauseMenu)
      }
    }

    registerListener(document, 'pointerlockchange', changeCallback, false)

    const cameraControlEl = hud

    /** after what time of holding the finger start breaking the block */
    const touchStartBreakingBlockMs = 500
    let virtualClickActive = false
    let virtualClickTimeout
    let screenTouches = 0
    let capturedPointer: { id; x; y; sourceX; sourceY; activateCameraMove; time } | undefined
    registerListener(document, 'pointerdown', (e) => {
      const clickedEl = e.composedPath()[0]
      if (!isGameActive(true) || !miscUiState.currentTouch || clickedEl !== cameraControlEl || e.pointerId === undefined) {
        return
      }
      screenTouches++
      if (screenTouches === 3) {
        // todo needs fixing!
        // window.dispatchEvent(new MouseEvent('mousedown', { button: 1 }))
      }
      if (capturedPointer) {
        return
      }
      cameraControlEl.setPointerCapture(e.pointerId)
      capturedPointer = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        sourceX: e.clientX,
        sourceY: e.clientY,
        activateCameraMove: false,
        time: Date.now()
      }
      virtualClickTimeout ??= setTimeout(() => {
        virtualClickActive = true
        document.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))
      }, touchStartBreakingBlockMs)
    })
    registerListener(document, 'pointermove', (e) => {
      if (e.pointerId === undefined || e.pointerId !== capturedPointer?.id) return
      window.scrollTo(0, 0)
      e.preventDefault()
      e.stopPropagation()

      const allowedJitter = 1.1
      // todo support .pressure (3d touch)
      const xDiff = Math.abs(e.pageX - capturedPointer.sourceX) > allowedJitter
      const yDiff = Math.abs(e.pageY - capturedPointer.sourceY) > allowedJitter
      if (!capturedPointer.activateCameraMove && (xDiff || yDiff)) capturedPointer.activateCameraMove = true
      if (capturedPointer.activateCameraMove) {
        clearTimeout(virtualClickTimeout)
      }
      onCameraMove({ movementX: e.pageX - capturedPointer.x, movementY: e.pageY - capturedPointer.y, type: 'touchmove' })
      capturedPointer.x = e.pageX
      capturedPointer.y = e.pageY
    }, { passive: false })

    const pointerUpHandler = (e: PointerEvent) => {
      if (e.pointerId === undefined || e.pointerId !== capturedPointer?.id) return
      clearTimeout(virtualClickTimeout)
      virtualClickTimeout = undefined

      if (virtualClickActive) {
        // button 0 is left click
        document.dispatchEvent(new MouseEvent('mouseup', { button: 0 }))
        virtualClickActive = false
      } else if (!capturedPointer.activateCameraMove && (Date.now() - capturedPointer.time < touchStartBreakingBlockMs)) {
        document.dispatchEvent(new MouseEvent('mousedown', { button: 2 }))
        worldInteractions.update()
        document.dispatchEvent(new MouseEvent('mouseup', { button: 2 }))
      }
      capturedPointer = undefined
      screenTouches--
    }
    registerListener(document, 'pointerup', pointerUpHandler)
    registerListener(document, 'pointercancel', pointerUpHandler)
    registerListener(document, 'lostpointercapture', pointerUpHandler)

    registerListener(document, 'contextmenu', (e) => e.preventDefault(), false)

    registerListener(document, 'blur', (e) => {
      bot.clearControlStates()
    }, false)

    console.log('Done!')

    onGameLoad(async () => {
      if (!viewer.world.downloadedBlockStatesData && !viewer.world.customBlockStatesData) {
        await new Promise<void>(resolve => {
          viewer.world.renderUpdateEmitter.once('blockStatesDownloaded', () => resolve())
        })
      }
      hud.init(renderer, bot, server.host)
      hud.style.display = 'block'
    })

    errorAbortController.abort()
    if (appStatusState.isError) return
    setLoadingScreenStatus(undefined)
    void viewer.waitForChunksToRender().then(() => {
      console.log('All done and ready!')
      document.dispatchEvent(new Event('cypress-world-ready'))
    })
  })
}

listenGlobalEvents()
watchValue(miscUiState, async s => {
  if (s.appLoaded) { // fs ready
    const qs = new URLSearchParams(window.location.search)
    if (qs.get('singleplayer') === '1') {
      loadSingleplayer({}, {
        worldFolder: undefined
      })
    }
    if (qs.get('loadSave')) {
      const savePath = `/data/worlds/${qs.get('loadSave')}`
      try {
        await fs.promises.stat(savePath)
      } catch (err) {
        alert(`Save ${savePath} not found`)
        return
      }
      await loadInMemorySave(savePath)
    }
  }
})

// #region fire click event on touch as we disable default behaviors
let activeTouch: { touch: Touch, elem: HTMLElement, start: number } | undefined
document.body.addEventListener('touchend', (e) => {
  if (!isGameActive(true)) return
  if (activeTouch?.touch.identifier !== e.changedTouches[0].identifier) return
  if (Date.now() - activeTouch.start > 500) {
    activeTouch.elem.dispatchEvent(new Event('longtouch', { bubbles: true }))
  } else {
    activeTouch.elem.click()
  }
  activeTouch = undefined
})
document.body.addEventListener('touchstart', (e) => {
  if (!isGameActive(true)) return
  e.preventDefault()
  let firstClickable // todo remove composedPath and this workaround when lit-element is fully dropped
  const path = e.composedPath() as Array<{ click?: () => void }>
  for (const elem of path) {
    if (elem.click) {
      firstClickable = elem
      break
    }
  }
  if (!firstClickable) return
  activeTouch = {
    touch: e.touches[0],
    elem: firstClickable,
    start: Date.now(),
  }
}, { passive: false })
// #endregion

downloadAndOpenFile().then((downloadAction) => {
  if (downloadAction) return

  window.addEventListener('hud-ready', (e) => {
    // try to connect to peer
    const qs = new URLSearchParams(window.location.search)
    const peerId = qs.get('connectPeer')
    const version = qs.get('peerVersion')
    if (peerId) {
      let username: string | null = options.guestUsername
      if (options.askGuestName) username = prompt('Enter your username', username)
      if (!username) return
      options.guestUsername = username
      void connect({
        username,
        botVersion: version || undefined,
        peerId
      })
    }
  })
  if (document.getElementById('hud').isReady) window.dispatchEvent(new Event('hud-ready'))
}, (err) => {
  console.error(err)
  alert(`Failed to download file: ${err}`)
})
