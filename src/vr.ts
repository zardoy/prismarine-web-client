import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js'
import { buttonMap as standardButtonsMap } from 'contro-max/build/gamepad'
import * as THREE from 'three'
import { activeModalStack, hideModal } from './globalState'

export async function initVR (viewer: any, setVrEnabled: React.Dispatch<React.SetStateAction<boolean>>) {
  const { renderer } = viewer
  if (!('xr' in navigator)) return
  const isSupported = await navigator.xr?.isSessionSupported('immersive-vr') && !!XRSession.prototype.updateRenderState // e.g. android webview doesn't support updateRenderState  if (!isSupported) return

  // VR Button
  const vrButton = VRButton.createButton(renderer) as HTMLButtonElement
  const closeButton = createCloseButton(vrButton, setVrEnabled)

  document.body.appendChild(vrButton)
  document.body.appendChild(closeButton)

  setupCameraAndControllers(renderer, viewer)

  renderer.xr.addEventListener('sessionstart', () => {
    viewer.cameraObjectOverride = viewer.user
    for (const _modal of activeModalStack) {
      hideModal(undefined, {}, { force: true })
    }
  })

  renderer.xr.addEventListener('sessionend', () => {
    viewer.cameraObjectOverride = undefined
  })

  return { vrButton, closeButton }
}

function createCloseButton (vrButton: HTMLButtonElement, setVrEnabled: React.Dispatch<React.SetStateAction<boolean>>): HTMLButtonElement {
  const closeButton = document.createElement('button')
  closeButton.textContent = 'X'
  closeButton.style.position = 'absolute'
  closeButton.style.bottom = '60px'
  closeButton.style.left = 'calc(50% + 50px)'
  closeButton.style.padding = '12px 12px'
  closeButton.style.background = 'rgba(255, 0, 0, 0.7)'
  closeButton.style.color = 'white'
  closeButton.style.border = 'none'
  closeButton.style.borderRadius = '2px'
  closeButton.style.cursor = 'pointer'
  closeButton.style.zIndex = '1000'

  closeButton.addEventListener('click', () => {
    vrButton.remove()
    closeButton.remove()
    setVrEnabled(false)
  })
  return closeButton
}

function setupCameraAndControllers (renderer: THREE.WebGLRenderer, viewer: any) {
  const user = new THREE.Group()
  user.add(viewer.camera)
  viewer.scene.add(user)

  const controllerModelFactory = new XRControllerModelFactory(new GLTFLoader())
  const controller1 = renderer.xr.getControllerGrip(0)
  const controller2 = renderer.xr.getControllerGrip(1)

  const virtualGamepadIndex = 4
  let connectedVirtualGamepad

  const manageXrInputSource = ({ gamepad, handedness = 'left' }, removeAction = false) => {
    if (handedness === 'right') {
      const event: any = new Event(removeAction ? 'gamepaddisconnected' : 'gamepadconnected')
      event.gamepad = removeAction ? connectedVirtualGamepad : { ...gamepad, mapping: 'standard', index: virtualGamepadIndex }
      connectedVirtualGamepad = event.gamepad
      window.dispatchEvent(event)
    }
  }

  let hand1: any = controllerModelFactory.createControllerModel(controller1)
  controller1.addEventListener('connected', (event) => {
    hand1.xrInputSource = event.data
    manageXrInputSource(event.data, false)
    user.add(controller1)
  })
  controller1.add(hand1)

  let hand2: any = controllerModelFactory.createControllerModel(controller2)
  controller2.addEventListener('connected', (event) => {
    hand2.xrInputSource = event.data
    manageXrInputSource(event.data, false)
    user.add(controller2)
  })
  controller2.add(hand2)

  controller1.addEventListener('disconnected', () => {
    manageXrInputSource(hand1.xrInputSource, true)
    hand1.xrInputSource = undefined
  })

  controller2.addEventListener('disconnected', () => {
    manageXrInputSource(hand2.xrInputSource, true)
    hand2.xrInputSource = undefined
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
      } as unknown as Gamepad
    ]
  }

  setupControllerEvents(controller1, hand1, viewer, 'left')
  setupControllerEvents(controller2, hand2, viewer, 'right')

  let rotSnapReset = true
  let yawOffset = 0
  renderer.setAnimationLoop(() => {
    if (!renderer.xr.isPresenting) return
    if (hand1.xrInputSource && hand2.xrInputSource) {
      hand1.xAxis = hand1.xrInputSource.gamepad.axes[2]
      hand1.yAxis = hand1.xrInputSource.gamepad.axes[3]
      hand2.xAxis = hand2.xrInputSource.gamepad.axes[2]
      hand2.yAxis = hand2.xrInputSource.gamepad.axes[3]

      if (hand1.xrInputSource.handedness === 'right') {
        [hand1, hand2] = [hand2, hand1]
      }
    }

    if (rotSnapReset && Math.abs(hand1.xAxis) > 0.8) {
      yawOffset -= Math.PI / 4 * Math.sign(hand1.xAxis)
      rotSnapReset = false
    } else if (Math.abs(hand1.xAxis) < 0.1) {
      rotSnapReset = true
    }

    // todo restore this logic (need to preserve ability to move camera)
    // const xrCamera = renderer.xr.getCamera()
    // const d = xrCamera.getWorldDirection(new THREE.Vector3())
    // bot.entity.yaw = Math.atan2(-d.x, -d.z)
    // bot.entity.pitch = Math.asin(d.y)

    // todo ?
    // bot.physics.stepHeight = 1

    // viewer.setFirstPersonCamera(null, yawOffset, 0)
    viewer.setFirstPersonCamera(null, yawOffset, 0)
    viewer.render()
  })
}

function setupControllerEvents (controller: any, hand: any, viewer: any, handedness: string) {
  controller.addEventListener('connected', (event: any) => {
    hand.xrInputSource = event.data
    viewer.user.add(controller)
  })
  controller.addEventListener('disconnected', () => {
    hand.xrInputSource = undefined
  })
  controller.add(hand)
}

const xrStandardRightButtonsMap = [
  [0, 'Right Trigger'],
  [1, 'Right Bumper'],
  [3, 'Right Stick'],
  [4, 'A'],
  [5, 'B']
]

const xrStandardLeftButtonsMap = [
  [0, 'Left Trigger'],
  [1, 'Left Bumper'],
  [3, 'Left Stick'],
  [4, 'X'],
  [5, 'Y']
]

const remapButtons = (rightButtons: any[], leftButtons: any[]) => {
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

const remapAxes = (axesRight: any[], axesLeft: any[]) => {
  return [
    axesLeft[2],
    axesLeft[3],
    axesRight[2],
    axesRight[3]
  ]
}

export function disableVR (vrButton: HTMLButtonElement | null, closeButton: HTMLButtonElement | null) {
  if (vrButton) {
    vrButton.remove()
  }
  if (closeButton) {
    closeButton.remove()
  }
}
