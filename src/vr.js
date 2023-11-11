const { VRButton } = require('three/examples/jsm/webxr/VRButton.js')
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js')
const { XRControllerModelFactory } = require('three/examples/jsm/webxr/XRControllerModelFactory.js')
const { buttonMap: standardButtonsMap } = require('contro-max/build/gamepad')
const { activeModalStack, hideModal } = require('./globalState')

async function initVR () {
  const { renderer } = viewer
  if (!('xr' in navigator)) return
  const isSupported = await navigator.xr.isSessionSupported('immersive-vr') && !!XRSession.prototype.updateRenderState // e.g. android webview doesn't support updateRenderState
  if (!isSupported) return

  // VR
  document.body.appendChild(VRButton.createButton(renderer))
  renderer.xr.enabled = true

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
  const manageXrInputSource = ({ gamepad, handedness = defaultHandedness }, defaultHandedness, removeAction = false) => {
    if (handedness === 'right') {
      const event = new Event(removeAction ? 'gamepaddisconnected' : 'gamepadconnected') // todo need to expose and use external gamepads api in contro-max instead
      event.gamepad = removeAction ? connectedVirtualGamepad : { ...gamepad, mapping: 'standard', index: virtualGamepadIndex }
      connectedVirtualGamepad = event.gamepad
      window.dispatchEvent(event)
    }
  }
  let hand1 = controllerModelFactory.createControllerModel(controller1)
  controller1.addEventListener('connected', (event) => {
    hand1.xrInputSource = event.data
    manageXrInputSource(event.data, 'left')
    user.add(controller1)
  })
  controller1.add(hand1)
  let hand2 = controllerModelFactory.createControllerModel(controller2)
  controller2.addEventListener('connected', (event) => {
    hand2.xrInputSource = event.data
    manageXrInputSource(event.data, 'right')
    user.add(controller2)
  })
  controller2.add(hand2)

  controller1.addEventListener('disconnected', () => {
    // don't handle removal of gamepads for now as is don't affect contro-max
    hand1.xrInputSource = undefined
    manageXrInputSource(hand1.xrInputSource, 'left', true)
  })
  controller2.addEventListener('disconnected', () => {
    hand2.xrInputSource = undefined
    manageXrInputSource(hand1.xrInputSource, 'right', true)
  })

  const originalGetGamepads = navigator.getGamepads.bind(navigator)
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
    // const xrCamera = renderer.xr.getCamera(viewer.camera)
    // const d = xrCamera.getWorldDirection() // todo target
    // bot.entity.yaw = Math.atan2(-d.x, -d.z)
    // bot.entity.pitch = Math.asin(d.y)

    // todo ?
    // bot.physics.stepHeight = 1

    viewer.update()
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
}

module.exports.initVR = initVR

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
const remapButtons = (rightButtons, leftButtons) => {
  // return remapped buttons
  const remapped = []
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
