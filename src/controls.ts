//@ts-check

import { Vec3 } from 'vec3'
import { proxy, subscribe } from 'valtio'

import { ControMax } from 'contro-max/build/controMax'
import { CommandEventArgument, SchemaCommandInput } from 'contro-max/build/types'
import { stringStartsWith } from 'contro-max/build/stringUtils'
import { isGameActive, showModal, gameAdditionalState, activeModalStack, hideCurrentModal, miscUiState } from './globalState'
import { goFullscreen, pointerLock, reloadChunks } from './utils'
import { options } from './optionsStorage'
import { openPlayerInventory } from './playerWindows'

// doesnt seem to work for now
const customKeymaps = proxy(JSON.parse(localStorage.keymap || '{}'))
subscribe(customKeymaps, () => {
  localStorage.keymap = JSON.parse(customKeymaps)
})

export const contro = new ControMax({
  commands: {
    general: {
      jump: ['Space', 'A'],
      inventory: ['KeyE', 'X'],
      drop: ['KeyQ', 'B'],
      sneak: ['ShiftLeft', 'Right Stick'],
      sprint: ['ControlLeft', 'Left Stick'],
      nextHotbarSlot: [null, 'Left Bumper'],
      prevHotbarSlot: [null, 'Right Bumper'],
      attackDestroy: [null, 'Right Trigger'],
      interactPlace: [null, 'Left Trigger'],
      chat: [['KeyT', 'Enter']],
      command: ['Slash'],
      selectItem: ['KeyH'] // default will be removed
    },
    ui: {
      back: [null/* 'Escape' */, 'B'],
      click: [null, 'A'],
    }
    // waila: {
    //   showLookingBlockRecipe: ['Numpad3'],
    //   showLookingBlockUsages: ['Numpad4']
    // }
  } satisfies Record<string, Record<string, SchemaCommandInput>>,
  movementKeymap: 'WASD',
  movementVector: '2d',
  groupedCommands: {
    general: {
      switchSlot: ['Digits', []]
    }
  },
}, {
  target: document,
  captureEvents () {
    return bot && isGameActive(false)
  },
  storeProvider: {
    load: () => customKeymaps,
    save () { },
  },
  gamepadPollingInterval: 10
})
export type Command = CommandEventArgument<typeof contro['_commandsRaw']>['command']

const setSprinting = (state: boolean) => {
  bot.setControlState('sprint', state)
  gameAdditionalState.isSprinting = state
}

contro.on('movementUpdate', ({ vector, gamepadIndex }) => {
  miscUiState.usingGamepadInput = gamepadIndex !== undefined
  // gamepadIndex will be used for splitscreen in future
  const coordToAction = [
    ['z', -1, 'forward'],
    ['z', 1, 'back'],
    ['x', -1, 'left'],
    ['x', 1, 'right'],
  ] as const

  const newState: Partial<typeof bot.controlState> = {}
  for (const [coord, v] of Object.entries(vector)) {
    if (v === undefined || Math.abs(v) < 0.3) continue
    // todo use raw values eg for slow movement
    const mappedValue = v < 0 ? -1 : 1
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    const foundAction = coordToAction.find(([c, mapV]) => c === coord && mapV === mappedValue)?.[2]!
    newState[foundAction] = true
  }

  for (const key of ['forward', 'back', 'left', 'right'] as const) {
    if (newState[key] === bot.controlState[key]) continue
    const action = !!newState[key]
    if (action && !isGameActive(true)) continue
    bot.setControlState(key, action)

    if (key === 'forward') {
      // todo workaround: need to refactor
      if (action) {
        void contro.emit('trigger', { command: 'general.forward' } as any)
      } else {
        setSprinting(false)
      }
    }
  }
})

let lastCommandTrigger = null as { command: string, time: number } | null

const secondActionActivationTimeout = 300
const secondActionCommands = {
  'general.jump' () {
    toggleFly()
  },
  'general.forward' () {
    setSprinting(true)
  }
}

// detect pause open, as ANY keyup event is not fired when you exit pointer lock (esc)
subscribe(activeModalStack, () => {
  if (activeModalStack.length) {
    // iterate over pressedKeys
    for (const key of contro.pressedKeys) {
      contro.pressedKeyOrButtonChanged({ code: key }, false)
    }
  }
})

const uiCommand = (command: Command) => {
  if (command === 'ui.back') {
    hideCurrentModal()
  } else if (command === 'ui.click') {
    // todo cursor
  }
}

const onTriggerOrReleased = (command: Command, pressed: boolean) => {
  // always allow release!
  if (pressed && !isGameActive(true)) {
    uiCommand(command)
    return
  }
  if (stringStartsWith(command, 'general')) {
    // handle general commands
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (command) {
      case 'general.jump':
        bot.setControlState('jump', pressed)
        break
      case 'general.sneak':
        gameAdditionalState.isSneaking = pressed
        bot.setControlState('sneak', pressed)
        break
      case 'general.sprint':
        // todo add setting to change behavior
        if (pressed) {
          setSprinting(pressed)
        }
        break
      case 'general.attackDestroy':
        document.dispatchEvent(new MouseEvent(pressed ? 'mousedown' : 'mouseup', { button: 0 }))
        break
      case 'general.interactPlace':
        document.dispatchEvent(new MouseEvent(pressed ? 'mousedown' : 'mouseup', { button: 2 }))
        break
    }
  }
}

// im still not sure, maybe need to refactor to handle in inventory instead
const alwaysHandledCommand = (command: Command) => {
  if (command === 'general.inventory') {
    if (activeModalStack.at(-1)?.reactType?.startsWith?.('player_win:')) { // todo?
      hideCurrentModal()
    }
  }
}

contro.on('trigger', ({ command }) => {
  const willContinue = !isGameActive(true)
  alwaysHandledCommand(command)
  if (willContinue) return

  const secondActionCommand = secondActionCommands[command]
  if (secondActionCommand) {
    if (command === lastCommandTrigger?.command && Date.now() - lastCommandTrigger.time < secondActionActivationTimeout) {
      const commandToTrigger = secondActionCommands[lastCommandTrigger.command]
      commandToTrigger()
      lastCommandTrigger = null
    } else {
      lastCommandTrigger = {
        command,
        time: Date.now(),
      }
    }
  }

  onTriggerOrReleased(command, true)

  if (stringStartsWith(command, 'general')) {
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (command) {
      case 'general.inventory':
        document.exitPointerLock?.()
        openPlayerInventory()
        break
      case 'general.drop':
        // if (bot.heldItem/* && ctrl */) bot.tossStack(bot.heldItem)
        bot._client.write('block_dig', {
          'status': 4,
          'location': {
            'x': 0,
            'z': 0,
            'y': 0
          },
          'face': 0,
          sequence: 0
        })
        break
      case 'general.chat':
        document.getElementById('hud').shadowRoot.getElementById('chat').enableChat()
        break
      case 'general.command':
        document.getElementById('hud').shadowRoot.getElementById('chat').enableChat('/')
        break
      case 'general.selectItem':
        void selectItem()
        break
    }
  }
})

contro.on('release', ({ command }) => {
  onTriggerOrReleased(command, false)
})

// hard-coded keybindings

export const f3Keybinds = [
  {
    key: 'KeyA',
    action () {
      //@ts-expect-error
      const loadedChunks = Object.entries(worldView.loadedChunks).filter(([, v]) => v).map(([key]) => key.split(',').map(Number))
      for (const [x, z] of loadedChunks) {
        worldView!.unloadChunk({ x, z })
      }
      for (const child of viewer.scene.children) {
        if (child.name === 'chunk') { // should not happen
          viewer.scene.remove(child)
          console.warn('forcefully removed chunk from scene')
        }
      }
      if (localServer) {
        //@ts-expect-error not sure why it is private... maybe revisit api?
        localServer.players[0].world.columns = {}
      }
      void reloadChunks()
    },
    mobileTitle: 'Reload chunks',
  },
  {
    key: 'KeyG',
    action () {
      options.showChunkBorders = !options.showChunkBorders
      viewer.world.updateShowChunksBorder(options.showChunkBorders)
    },
    mobileTitle: 'Toggle chunk borders',
  }
]

const hardcodedPressedKeys = new Set<string>()
document.addEventListener('keydown', (e) => {
  if (!isGameActive(false)) return
  if (hardcodedPressedKeys.has('F3')) {
    const keybind = f3Keybinds.find((v) => v.key === e.code)
    if (keybind) keybind.action()
    return
  }

  hardcodedPressedKeys.add(e.code)
})
document.addEventListener('keyup', (e) => {
  hardcodedPressedKeys.delete(e.code)
})
document.addEventListener('visibilitychange', (e) => {
  if (document.visibilityState === 'hidden') {
    hardcodedPressedKeys.clear()
  }
})

// #region creative fly
// these controls are more like for gamemode 3

const makeInterval = (fn, interval) => {
  const intervalId = setInterval(fn, interval)

  const cleanup = () => {
    clearInterval(intervalId)
    cleanup.active = false
  }
  cleanup.active = true
  return cleanup
}

const isFlying = () => bot.physics.gravity === 0
let endFlyLoop: ReturnType<typeof makeInterval> | undefined

const currentFlyVector = new Vec3(0, 0, 0)
window.currentFlyVector = currentFlyVector

const startFlyLoop = () => {
  if (!isFlying()) return
  endFlyLoop?.()

  endFlyLoop = makeInterval(() => {
    if (!bot) {
      endFlyLoop?.()
      return
    }

    bot.entity.position.add(currentFlyVector.clone().multiply(new Vec3(0, 0.5, 0)))
  }, 50)
}

// todo we will get rid of patching it when refactor controls
let originalSetControlState
const patchedSetControlState = (action, state) => {
  if (!isFlying()) {
    return originalSetControlState(action, state)
  }

  const actionPerFlyVector = {
    jump: new Vec3(0, 1, 0),
    sneak: new Vec3(0, -1, 0),
  }

  const changeVec = actionPerFlyVector[action]
  if (!changeVec) {
    return originalSetControlState(action, state)
  }
  const toAddVec = changeVec.scaled(state ? 1 : -1)
  for (const coord of ['x', 'y', 'z']) {
    if (toAddVec[coord] === 0) continue
    if (currentFlyVector[coord] === toAddVec[coord]) return
  }
  currentFlyVector.add(toAddVec)
}

const startFlying = (sendAbilities = true) => {
  if (sendAbilities) {
    bot._client.write('abilities', {
      flags: 2,
    })
  }
  // window.flyingSpeed will be removed
  bot.physics['airborneAcceleration'] = window.flyingSpeed ?? 0.1 // todo use abilities
  bot.entity.velocity = new Vec3(0, 0, 0)
  bot.creative.startFlying()
  startFlyLoop()
}

const endFlying = (sendAbilities = true) => {
  if (bot.physics.gravity !== 0) return
  if (sendAbilities) {
    bot._client.write('abilities', {
      flags: 0,
    })
  }
  bot.physics['airborneAcceleration'] = standardAirborneAcceleration
  bot.creative.stopFlying()
  endFlyLoop?.()
}

let allowFlying = false

export const onBotCreate = () => {
  bot._client.on('abilities', ({ flags }) => {
    allowFlying = !!(flags & 4)
    if (flags & 2) { // flying
      toggleFly(true, false)
    } else {
      toggleFly(false, false)
    }
  })
}

const standardAirborneAcceleration = 0.02
const toggleFly = (newState = !isFlying(), sendAbilities?: boolean) => {
  // if (bot.game.gameMode !== 'creative' && bot.game.gameMode !== 'spectator') return
  if (!allowFlying) return
  if (bot.setControlState !== patchedSetControlState) {
    originalSetControlState = bot.setControlState
    bot.setControlState = patchedSetControlState
  }

  if (newState) {
    startFlying(sendAbilities)
  } else {
    endFlying(sendAbilities)
  }
  gameAdditionalState.isFlying = isFlying()
}
// #endregion

const selectItem = async () => {
  const block = bot.blockAtCursor(5)
  if (!block) return
  const itemId = loadedData.itemsByName[block.name]?.id
  if (!itemId) return
  const Item = require('prismarine-item')(bot.version)
  const item = new Item(itemId, 1, 0)
  await bot.creative.setInventorySlot(bot.inventory.hotbarStart + bot.quickBarSlot, item)
  bot.updateHeldItem()
}

addEventListener('mousedown', async (e) => {
  if ((e.target as HTMLElement).matches?.('#VRButton')) return
  void pointerLock.requestPointerLock()
  if (!bot) return
  // wheel click
  // todo support ctrl+wheel (+nbt)
  if (e.button === 1) {
    await selectItem()
  }
})

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return
  if (activeModalStack.length) {
    hideCurrentModal(undefined, () => {
      if (!activeModalStack.length) {
        pointerLock.justHitEscape = true
      }
    })
  } else if (pointerLock.hasPointerLock) {
    document.exitPointerLock?.()
    if (options.autoExitFullscreen) {
      void document.exitFullscreen()
    }
  } else {
    document.dispatchEvent(new Event('pointerlockchange'))
  }
})

// #region experimental debug things
window.addEventListener('keydown', (e) => {
  if (e.code === 'F11') {
    e.preventDefault()
    void goFullscreen(true)
  }
  if (e.code === 'KeyL' && e.altKey) {
    console.clear()
  }
})
// #endregion
