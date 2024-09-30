//@ts-check

import * as THREE from 'three'

// wouldn't better to create atlas instead?
import { Vec3 } from 'vec3'
import { LineMaterial, Wireframe, LineSegmentsGeometry } from 'three-stdlib'
import { Entity } from 'prismarine-entity'
import destroyStage0 from '../assets/destroy_stage_0.png'
import destroyStage1 from '../assets/destroy_stage_1.png'
import destroyStage2 from '../assets/destroy_stage_2.png'
import destroyStage3 from '../assets/destroy_stage_3.png'
import destroyStage4 from '../assets/destroy_stage_4.png'
import destroyStage5 from '../assets/destroy_stage_5.png'
import destroyStage6 from '../assets/destroy_stage_6.png'
import destroyStage7 from '../assets/destroy_stage_7.png'
import destroyStage8 from '../assets/destroy_stage_8.png'
import destroyStage9 from '../assets/destroy_stage_9.png'

import { hideCurrentModal, isGameActive, showModal } from './globalState'
import { assertDefined } from './utils'
import { options } from './optionsStorage'
import { itemBeingUsed } from './react/Crosshair'
import { isCypress } from './standaloneUtils'
import { displayClientChat } from './botUtils'

function getViewDirection (pitch, yaw) {
  const csPitch = Math.cos(pitch)
  const snPitch = Math.sin(pitch)
  const csYaw = Math.cos(yaw)
  const snYaw = Math.sin(yaw)
  return new Vec3(-snYaw * csPitch, snPitch, -csYaw * csPitch)
}

class WorldInteraction {
  ready = false
  interactionLines: null | { blockPos; mesh } = null
  prevBreakState
  currentDigTime
  prevOnGround
  lastBlockPlaced: number
  lastSwing = 0
  buttons = [false, false, false]
  lastButtons = [false, false, false]
  breakStartTime: number | undefined = 0
  lastDugBlock: Vec3 | null = null
  cursorBlock: import('prismarine-block').Block | null = null
  blockBreakMesh: THREE.Mesh
  breakTextures: THREE.Texture[]
  lastDigged: number
  lineMaterial: LineMaterial
  debugDigStatus: string

  oneTimeInit () {
    const loader = new THREE.TextureLoader()
    this.breakTextures = []
    const destroyStagesImages = [
      destroyStage0,
      destroyStage1,
      destroyStage2,
      destroyStage3,
      destroyStage4,
      destroyStage5,
      destroyStage6,
      destroyStage7,
      destroyStage8,
      destroyStage9
    ]
    for (let i = 0; i < 10; i++) {
      const texture = loader.load(destroyStagesImages[i])
      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter
      this.breakTextures.push(texture)
    }
    const breakMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      blending: THREE.MultiplyBlending,
      alphaTest: 0.5,
    })
    this.blockBreakMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), breakMaterial)
    this.blockBreakMesh.visible = false
    this.blockBreakMesh.renderOrder = 999
    this.blockBreakMesh.name = 'blockBreakMesh'
    viewer.scene.add(this.blockBreakMesh)

    // Setup events
    document.addEventListener('mouseup', (e) => {
      this.buttons[e.button] = false
    })

    this.lastBlockPlaced = 4 // ticks since last placed
    document.addEventListener('mousedown', (e) => {
      if (e.isTrusted && !document.pointerLockElement && !isCypress()) return
      if (!isGameActive(true)) return
      this.buttons[e.button] = true

      const entity = getEntityCursor()

      if (entity) {
        if (e.button === 0) { // left click
          bot.attack(entity)
        } else if (e.button === 2) { // right click
          this.activateEntity(entity)
        }
      }
    })
    document.addEventListener('blur', (e) => {
      this.buttons = [false, false, false]
    })

    beforeRenderFrame.push(() => {
      if (this.lineMaterial) {
        const { renderer } = viewer
        this.lineMaterial.resolution.set(renderer.domElement.width, renderer.domElement.height)
        this.lineMaterial.dashOffset = performance.now() / 750
      }
    })
  }

  initBot () {
    if (!this.ready) {
      this.ready = true
      this.oneTimeInit()
    }
    assertDefined(viewer)
    bot.on('physicsTick', () => { if (this.lastBlockPlaced < 4) this.lastBlockPlaced++ })
    bot.on('diggingCompleted', (block) => {
      this.breakStartTime = undefined
      this.lastDugBlock = block.position
      // TODO: If the tool and enchantments immediately exceed the hardness times 30, the block breaks with no delay; SO WE NEED TO CHECK THAT
      // TODO: Any blocks with a breaking time of 0.05
      this.lastDigged = Date.now()
      this.debugDigStatus = 'done'
    })
    bot.on('diggingAborted', (block) => {
      if (!this.cursorBlock?.position.equals(block.position)) return
      this.debugDigStatus = 'aborted'
      // if (this.lastDugBlock)
      this.breakStartTime = undefined
      if (this.buttons[0]) {
        this.buttons[0] = false
        this.update()
        this.buttons[0] = true // trigger again
      }
      this.lastDugBlock = null
    })
    bot.on('heldItemChanged' as any, () => {
      itemBeingUsed.name = null
    })

    const upLineMaterial = () => {
      const inCreative = bot.game.gameMode === 'creative'
      const pixelRatio = viewer.renderer.getPixelRatio()
      this.lineMaterial = new LineMaterial({
        color: inCreative ? 0x40_80_ff : 0x00_00_00,
        linewidth: Math.max(pixelRatio * 0.7, 1) * 2,
        // dashed: true,
        // dashSize: 5,
      })
    }
    upLineMaterial()
    // todo use gamemode update only
    bot.on('game', upLineMaterial)
  }

  activateEntity (entity: Entity) {
    // mineflayer has completely wrong implementation of this action
    if (bot.supportFeature('armAnimationBeforeUse')) {
      bot.swingArm('right')
    }
    bot._client.write('use_entity', {
      target: entity.id,
      mouse: 2,
      // todo do not fake
      x: 0.581_012_585_759_162_9,
      y: 0.581_012_585_759_162_9,
      z: 0.581_012_585_759_162_9,
      // x: raycastPosition.x - entity.position.x,
      // y: raycastPosition.y - entity.position.y,
      // z: raycastPosition.z - entity.position.z
      sneaking: bot.getControlState('sneak'),
      hand: 0
    })
    bot._client.write('use_entity', {
      target: entity.id,
      mouse: 0,
      sneaking: bot.getControlState('sneak'),
      hand: 0
    })
    if (!bot.supportFeature('armAnimationBeforeUse')) {
      bot.swingArm('right')
    }
  }

  updateBlockInteractionLines (blockPos: Vec3 | null, shapePositions?: Array<{ position; width; height; depth }>) {
    assertDefined(viewer)
    if (blockPos && this.interactionLines && blockPos.equals(this.interactionLines.blockPos)) {
      return
    }
    if (this.interactionLines !== null) {
      viewer.scene.remove(this.interactionLines.mesh)
      this.interactionLines = null
    }
    if (blockPos === null) {
      return
    }

    const group = new THREE.Group()
    for (const { position, width, height, depth } of shapePositions ?? []) {
      const scale = [1.0001 * width, 1.0001 * height, 1.0001 * depth] as const
      const geometry = new THREE.BoxGeometry(...scale)
      const lines = new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geometry))
      const wireframe = new Wireframe(lines, this.lineMaterial)
      const pos = blockPos.plus(position)
      wireframe.position.set(pos.x, pos.y, pos.z)
      wireframe.computeLineDistances()
      group.add(wireframe)
    }
    viewer.scene.add(group)
    this.interactionLines = { blockPos, mesh: group }
  }

  // todo this shouldnt be done in the render loop, migrate the code to dom events to avoid delays on lags
  update () {
    const inSpectator = bot.game.gameMode === 'spectator'
    const entity = getEntityCursor()
    let cursorBlock = inSpectator && !options.showCursorBlockInSpectator ? null : bot.blockAtCursor(5)
    if (entity) {
      cursorBlock = null
    }

    let cursorBlockDiggable = cursorBlock
    if (cursorBlock && !bot.canDigBlock(cursorBlock) && bot.game.gameMode !== 'creative') cursorBlockDiggable = null

    let cursorChanged = !cursorBlock !== !this.cursorBlock
    if (cursorBlock && this.cursorBlock) {
      cursorChanged = !cursorBlock.position.equals(this.cursorBlock.position)
    }

    // Place / interact / activate
    if (this.buttons[2] && this.lastBlockPlaced >= 4) {
      const activatableItems = (itemName: string) => {
        return ['egg', 'fishing_rod', 'firework_rocket',
          'fire_charge', 'snowball', 'ender_pearl', 'experience_bottle', 'potion',
          'glass_bottle', 'bucket', 'water_bucket', 'lava_bucket', 'milk_bucket',
          'minecart', 'boat', 'tnt_minecart', 'chest_minecart', 'hopper_minecart',
          'command_block_minecart', 'armor_stand', 'lead', 'name_tag',
          //
          'writable_book', 'written_book', 'compass', 'clock', 'filled_map', 'empty_map', 'map',
          'shears', 'carrot_on_a_stick', 'warped_fungus_on_a_stick',
          'spawn_egg', 'trident', 'crossbow', 'elytra', 'shield', 'turtle_helmet', 'bow', 'crossbow', 'bucket_of_cod',
          ...loadedData.foodsArray.map((f) => f.name),
        ].includes(itemName)
      }
      const activate = bot.heldItem && activatableItems(bot.heldItem.name)
      let stop = false
      if (!bot.controlState.sneak) {
        if (cursorBlock?.name === 'bed' || cursorBlock?.name.endsWith('_bed')) {
          stop = true
          showModal({ reactType: 'bed' })
          let cancelSleep = true
          void bot.sleep(cursorBlock).catch((e) => {
            if (cancelSleep) {
              hideCurrentModal()
            }
            // if (e.message === 'bot is not sleeping') return
            displayClientChat(e.message)
          })
          setTimeout(() => {
            cancelSleep = false
          })
        }
      }
      // todo placing with offhand
      if (cursorBlock && !activate && !stop) {
        const vecArray = [new Vec3(0, -1, 0), new Vec3(0, 1, 0), new Vec3(0, 0, -1), new Vec3(0, 0, 1), new Vec3(-1, 0, 0), new Vec3(1, 0, 0)]
        //@ts-expect-error
        const delta = cursorBlock.intersect.minus(cursorBlock.position)

        if (bot.heldItem) {
          //@ts-expect-error todo
          bot._placeBlockWithOptions(cursorBlock, vecArray[cursorBlock.face], { delta, forceLook: 'ignore' }).catch(console.warn)
        } else {
          // https://discord.com/channels/413438066984747026/413438150594265099/1198724637572477098
          const oldLookAt = bot.lookAt
          //@ts-expect-error
          bot.lookAt = (pos) => { }
          //@ts-expect-error
          // TODO it still must 1. fire block place 2. swing arm (right)
          bot.activateBlock(cursorBlock, vecArray[cursorBlock.face], delta).finally(() => {
            bot.lookAt = oldLookAt
          }).catch(console.warn)
        }
        viewer.world.changeHandSwingingState(true)
        viewer.world.changeHandSwingingState(false)
      } else if (!stop) {
        const offhand = activate ? false : activatableItems(bot.inventory.slots[45]?.name ?? '')
        bot.activateItem(offhand) // todo offhand
        const item = offhand ? bot.inventory.slots[45] : bot.heldItem
        if (item) {
          customEvents.emit('activateItem', item, offhand ? 45 : bot.quickBarSlot, offhand)
        }
        itemBeingUsed.name = (offhand ? bot.inventory.slots[45]?.name : bot.heldItem?.name) ?? null
        itemBeingUsed.hand = offhand ? 1 : 0
      }
      this.lastBlockPlaced = 0
    }
    // stop using activated item (cancel)
    if (itemBeingUsed.name && !this.buttons[2]) {
      itemBeingUsed.name = null
      // "only foods and bow can be deactivated" - not true, shields also can be deactivated and client always sends this
      // if (bot.heldItem && (loadedData.foodsArray.map((f) => f.name).includes(bot.heldItem.name) || bot.heldItem.name === 'bow')) {
      bot.deactivateItem()
      // }
    }

    // Stop break
    if ((!this.buttons[0] && this.lastButtons[0]) || cursorChanged) {
      try {
        bot.stopDigging() // this shouldnt throw anything...
      } catch (e) { } // to be reworked in mineflayer, then remove the try here
    }
    // We stopped breaking
    if ((!this.buttons[0] && this.lastButtons[0])) {
      this.lastDugBlock = null
      this.breakStartTime = undefined
      this.debugDigStatus = 'cancelled'
    }

    const onGround = bot.entity.onGround || bot.game.gameMode === 'creative'
    this.prevOnGround ??= onGround // todo this should be fixed in mineflayer to involve correct calculations when this changes as this is very important when mining straight down // todo this should be fixed in mineflayer to involve correct calculations when this changes as this is very important when mining straight down // todo this should be fixed in mineflayer to involve correct calculations when this changes as this is very important when mining straight down
    // Start break
    // todo last check doesnt work as cursorChanged happens once (after that check is false)
    if (
      this.buttons[0]
    ) {
      if (cursorBlockDiggable
        && (!this.lastButtons[0] || ((cursorChanged || (this.lastDugBlock && !this.lastDugBlock.equals(cursorBlock!.position))) && Date.now() - (this.lastDigged ?? 0) > 300) || onGround !== this.prevOnGround)
        && onGround) {
        this.lastDugBlock = null
        this.debugDigStatus = 'breaking'
        this.currentDigTime = bot.digTime(cursorBlockDiggable)
        this.breakStartTime = performance.now()
        const vecArray = [new Vec3(0, -1, 0), new Vec3(0, 1, 0), new Vec3(0, 0, -1), new Vec3(0, 0, 1), new Vec3(-1, 0, 0), new Vec3(1, 0, 0)]
        bot.dig(
          //@ts-expect-error
          cursorBlockDiggable, 'ignore', vecArray[cursorBlockDiggable.face]
        ).catch((err) => {
          if (err.message === 'Digging aborted') return
          throw err
        })
        customEvents.emit('digStart')
        this.lastDigged = Date.now()
        viewer.world.changeHandSwingingState(true)
      } else if (performance.now() - this.lastSwing > 200) {
        bot.swingArm('right')
        this.lastSwing = performance.now()
      }
    }
    if (!this.buttons[0] && this.lastButtons[0]) {
      viewer.world.changeHandSwingingState(false)
    }
    this.prevOnGround = onGround

    // Show cursor
    if (cursorBlock) {
      const allShapes = [...cursorBlock.shapes, ...cursorBlock['interactionShapes'] ?? []]
      this.updateBlockInteractionLines(cursorBlock.position, allShapes.map(shape => {
        return getDataFromShape(shape)
      }))
      {
        // union of all values
        const breakShape = allShapes.reduce((acc, cur) => {
          return [
            Math.min(acc[0], cur[0]),
            Math.min(acc[1], cur[1]),
            Math.min(acc[2], cur[2]),
            Math.max(acc[3], cur[3]),
            Math.max(acc[4], cur[4]),
            Math.max(acc[5], cur[5])
          ]
        })
        const { position, width, height, depth } = getDataFromShape(breakShape)
        this.blockBreakMesh.scale.set(width * 1.001, height * 1.001, depth * 1.001)
        position.add(cursorBlock.position)
        this.blockBreakMesh.position.set(position.x, position.y, position.z)
      }
    } else {
      this.updateBlockInteractionLines(null)
    }

    // Show break animation
    if (cursorBlockDiggable && this.breakStartTime && bot.game.gameMode !== 'creative') {
      const elapsed = performance.now() - this.breakStartTime
      const time = bot.digTime(cursorBlockDiggable)
      if (time !== this.currentDigTime) {
        console.warn('dig time changed! cancelling!', time, 'from', this.currentDigTime) // todo
        try { bot.stopDigging() } catch { }
      }
      const state = Math.floor((elapsed / time) * 10)
      //@ts-expect-error
      this.blockBreakMesh.material.map = this.breakTextures[state] ?? this.breakTextures.at(-1)
      if (state !== this.prevBreakState) {
        //@ts-expect-error
        this.blockBreakMesh.material.needsUpdate = true
      }
      this.prevBreakState = state
      this.blockBreakMesh.visible = true
    } else {
      this.blockBreakMesh.visible = false
    }

    // Update state
    this.cursorBlock = cursorBlock
    this.lastButtons[0] = this.buttons[0]
    this.lastButtons[1] = this.buttons[1]
    this.lastButtons[2] = this.buttons[2]
  }
}

const getDataFromShape = (shape) => {
  const width = shape[3] - shape[0]
  const height = shape[4] - shape[1]
  const depth = shape[5] - shape[2]
  const centerX = (shape[3] + shape[0]) / 2
  const centerY = (shape[4] + shape[1]) / 2
  const centerZ = (shape[5] + shape[2]) / 2
  const position = new Vec3(centerX, centerY, centerZ)
  return { position, width, height, depth }
}

export const getEntityCursor = () => {
  const entity = bot.nearestEntity((e) => {
    if (e.position.distanceTo(bot.entity.position) <= (bot.game.gameMode === 'creative' ? 5 : 3)) {
      const dir = getViewDirection(bot.entity.pitch, bot.entity.yaw)
      const { width, height } = e
      const { x: eX, y: eY, z: eZ } = e.position
      const { x: bX, y: bY, z: bZ } = bot.entity.position
      const box = new THREE.Box3(
        new THREE.Vector3(eX - width / 2, eY, eZ - width / 2),
        new THREE.Vector3(eX + width / 2, eY + height, eZ + width / 2)
      )

      const r = new THREE.Raycaster(
        new THREE.Vector3(bX, bY + 1.52, bZ),
        new THREE.Vector3(dir.x, dir.y, dir.z)
      )
      const int = r.ray.intersectBox(box, new THREE.Vector3(eX, eY, eZ))
      return int !== null
    }

    return false
  })
  return entity
}

const worldInteraction = new WorldInteraction()
globalThis.worldInteraction = worldInteraction
export default worldInteraction
