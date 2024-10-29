import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js'
import { buttonMap as standardButtonsMap } from 'contro-max/build/gamepad'
import * as THREE from 'three'
import { subscribeKey } from 'valtio/utils'
import { subscribe } from 'valtio'
import { activeModalStack, hideModal } from './globalState'
import { watchUnloadForCleanup } from './gameUnload'
import { options } from './optionsStorage'

export async function initVR () {
  options.vrSupport = true
  const { renderer } = viewer
  if (!('xr' in navigator)) return

  const isSupported = await checkVRSupport()
  if (!isSupported) return

  enableVr(renderer)

  const vrButtonContainer = createVrButtonContainer(renderer)
  const updateVrButtons = () => {
    vrButtonContainer.hidden = !options.vrSupport || activeModalStack.length !== 0
  }

  const unsubWatchSetting = subscribeKey(options, 'vrSupport', updateVrButtons)
  const unsubWatchModals = subscribe(activeModalStack, updateVrButtons)

  function enableVr (renderer) {
    renderer.xr.enabled = true
  }

  function disableVr () {
    renderer.xr.enabled = false
    viewer.cameraObjectOverride = undefined
    viewer.scene.remove(user)
    vrButtonContainer.hidden = true
    unsubWatchSetting()
    unsubWatchModals()
  }

  function createVrButtonContainer (renderer) {
    const container = document.createElement('div')
    const vrButton = VRButton.createButton(renderer)
    styleContainer(container)

    const closeButton = createCloseButton(container)

    container.appendChild(vrButton)
    container.appendChild(closeButton)
    document.body.appendChild(container)

    return container
  }

  function styleContainer (container: HTMLElement) {
    typedAssign(container.style, {
      position: 'absolute',
      bottom: '80px',
      left: '0',
      right: '0',
      display: 'flex',
      justifyContent: 'center',
      zIndex: '8',
      gap: '8px',
    })
  }

  function createCloseButton (container: HTMLElement) {
    const closeButton = document.createElement('button')
    closeButton.textContent = 'X'
    typedAssign(closeButton.style, {
      padding: '0 12px',
      color: 'white',
      fontSize: '14px',
      lineHeight: '20px',
      cursor: 'pointer',
      background: 'transparent',
      border: '1px solid rgb(255, 255, 255)',
      borderRadius: '4px',
      opacity: '0.7',
    })

    closeButton.addEventListener('click', () => {
      container.hidden = true
      options.vrSupport = false
    })

    return closeButton
  }


  async function checkVRSupport () {
    try {
      const supported = await navigator.xr?.isSessionSupported('immersive-vr')
      return supported && !!XRSession.prototype.updateRenderState
    } catch (err) {
      console.error('Error checking if VR is supported', err)
      return false
    }
  }

  // hack for vr camera
  const user = new THREE.Group()
  user.add(viewer.camera)
  viewer.scene.add(user)
  const controllerModelFactory = new XRControllerModelFactory(new GLTFLoader())
  const controller1 = renderer.xr.getControllerGrip(0)
  const controller2 = renderer.xr.getControllerGrip(1)

  // todo the logic written here can be hard to understand as it was designed to work in gamepad api emulation mode, will be refactored once there is a contro-max rewrite is done
  const virtualGamepadIndex = 4
  let connectedVirtualGamepad
  //@ts-expect-error
  const manageXrInputSource = ({ gamepad, handedness = defaultHandedness }, defaultHandedness, removeAction = false) => {
    if (handedness === 'right') {
      const event: any = new Event(removeAction ? 'gamepaddisconnected' : 'gamepadconnected') // todo need to expose and use external gamepads api in contro-max instead
      event.gamepad = removeAction ? connectedVirtualGamepad : { ...gamepad, mapping: 'standard', index: virtualGamepadIndex }
      connectedVirtualGamepad = event.gamepad
      window.dispatchEvent(event)
    }
  }
  let hand1: any = controllerModelFactory.createControllerModel(controller1)
  controller1.addEventListener('connected', (event) => {
    hand1.xrInputSource = event.data
    manageXrInputSource(event.data, 'left')
    user.add(controller1)
  })
  controller1.add(hand1)
  let hand2: any = controllerModelFactory.createControllerModel(controller2)
  controller2.addEventListener('connected', (event) => {
    hand2.xrInputSource = event.data
    manageXrInputSource(event.data, 'right')
    user.add(controller2)
  })
  controller2.add(hand2)

  controller1.addEventListener('disconnected', () => {
    // don't handle removal of gamepads for now as is don't affect contro-max
    manageXrInputSource(hand1.xrInputSource, 'left', true)
    hand1.xrInputSource = undefined
  })
  controller2.addEventListener('disconnected', () => {
    manageXrInputSource(hand1.xrInputSource, 'right', true)
    hand2.xrInputSource = undefined
  })

  const originalGetGamepads = navigator.getGamepads.bind(navigator)
  // is it okay to patch this?
  //@ts-expect-error
  navigator.getGamepads = () => {
    const originalGamepads = originalGetGamepads()
    if (!hand1.xrInputSource || !hand2.xrInputSource) return originalGamepads
    return [
      ...originalGamepads,
      {
        axes: remapAxes(hand2.xrInputSource.gamepad.axes, hand1.xrInputSource.gamepad.axes),
        buttons: remapButtons(hand2.xrInputSource.gamepad.buttons, hand1.xrInputSource.gamepad.buttons),
        connected: true,
        mapping: 'standard',
        id: '',
        index: virtualGamepadIndex
      }
    ]
  }

  let rotSnapReset = true
  let yawOffset = 0
  renderer.setAnimationLoop(() => {
    if (!renderer.xr.isPresenting) return
    if (hand1.xrInputSource && hand2.xrInputSource) {
      hand1.xAxis = hand1.xrInputSource.gamepad.axes[2]
      hand1.yAxis = hand1.xrInputSource.gamepad.axes[3]
      hand2.xAxis = hand2.xrInputSource.gamepad.axes[2]
      hand2.yAxis = hand2.xrInputSource.gamepad.axes[3]
      // hand2 should be right
      if (hand1.xrInputSource.handedness === 'right') {
        const tmp = hand2
        hand2 = hand1
        hand1 = tmp
      }
    }

    if (rotSnapReset) {
      if (Math.abs(hand1.xAxis) > 0.8) {
        yawOffset -= Math.PI / 4 * Math.sign(hand1.xAxis)
        rotSnapReset = false
      }
    } else if (Math.abs(hand1.xAxis) < 0.1) {
      rotSnapReset = true
    }

    // viewer.setFirstPersonCamera(null, yawOffset, 0)
    viewer.setFirstPersonCamera(null, bot.entity.yaw, bot.entity.pitch)

    // todo restore this logic (need to preserve ability to move camera)
    // const xrCamera = renderer.xr.getCamera()
    // const d = xrCamera.getWorldDirection(new THREE.Vector3())
    // bot.entity.yaw = Math.atan2(-d.x, -d.z)
    // bot.entity.pitch = Math.asin(d.y)

    // todo ?
    // bot.physics.stepHeight = 1

    viewer.render()
  })
  renderer.xr.addEventListener('sessionstart', () => {
    viewer.cameraObjectOverride = user
    // close all modals to be in game
    for (const _modal of activeModalStack) {
      hideModal(undefined, {}, { force: true })
    }
  })
  renderer.xr.addEventListener('sessionend', () => {
    viewer.cameraObjectOverride = undefined
  })

  watchUnloadForCleanup(disableVr)
}

const xrStandardRightButtonsMap = [
  [0 /* trigger */, 'Right Trigger'],
  [1 /* squeeze */, 'Right Bumper'],
  // need to think of a way to support touchpad input
  [3 /* Thumbstick Press */, 'Right Stick'],
  [4 /* A */, 'A'],
  [5 /* B */, 'B'],
]
const xrStandardLeftButtonsMap = [
  [0 /* trigger */, 'Left Trigger'],
  [1 /* squeeze */, 'Left Bumper'],
  // need to think of a way to support touchpad input
  [3 /* Thumbstick Press */, 'Left Stick'],
  [4 /* A */, 'X'],
  [5 /* B */, 'Y'],
]
const remapButtons = (rightButtons: any[], leftButtons: any[]) => {
  // return remapped buttons
  const remapped = [] as string[]
  const remapWithMap = (buttons, map) => {
    for (const [index, standardName] of map) {
      const standardMappingIndex = standardButtonsMap.findIndex((aliases) => aliases.find(alias => standardName === alias))
      remapped[standardMappingIndex] = buttons[index]
    }
  }
  remapWithMap(rightButtons, xrStandardRightButtonsMap)
  remapWithMap(leftButtons, xrStandardLeftButtonsMap)
  return remapped
}
const remapAxes = (axesRight, axesLeft) => {
  // 0, 1 are reserved for touch
  return [
    axesLeft[2],
    axesLeft[3],
    axesRight[2],
    axesRight[3]
  ]
}

function typedAssign<T extends Record<string, any>> (target: T, source: Partial<T>) {
  Object.assign(target, source)
}
