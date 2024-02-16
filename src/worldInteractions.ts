//@ts-check

// wouldn't better to create atlas instead?
import destroyStage0 from 'minecraft-assets/minecraft-assets/data/1.10/blocks/destroy_stage_0.png'
import destroyStage1 from 'minecraft-assets/minecraft-assets/data/1.10/blocks/destroy_stage_1.png'
import destroyStage2 from 'minecraft-assets/minecraft-assets/data/1.10/blocks/destroy_stage_2.png'
import destroyStage3 from 'minecraft-assets/minecraft-assets/data/1.10/blocks/destroy_stage_3.png'
import destroyStage4 from 'minecraft-assets/minecraft-assets/data/1.10/blocks/destroy_stage_4.png'
import destroyStage5 from 'minecraft-assets/minecraft-assets/data/1.10/blocks/destroy_stage_5.png'
import destroyStage6 from 'minecraft-assets/minecraft-assets/data/1.10/blocks/destroy_stage_6.png'
import destroyStage7 from 'minecraft-assets/minecraft-assets/data/1.10/blocks/destroy_stage_7.png'
import destroyStage8 from 'minecraft-assets/minecraft-assets/data/1.10/blocks/destroy_stage_8.png'
import destroyStage9 from 'minecraft-assets/minecraft-assets/data/1.10/blocks/destroy_stage_9.png'

import { Vec3 } from 'vec3'
import { LineMaterial, Wireframe, LineSegmentsGeometry } from 'three-stdlib'
import { isGameActive } from './globalState'
import { assertDefined } from './utils'
import { options } from './optionsStorage'
import { digGlobally, stopDigging } from './mineflayerUtils'

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
  breakStartTime: number | undefined = 0
  blockBreakMesh: THREE.Mesh
  breakTextures: THREE.Texture[]
  lineMaterial: LineMaterial
  // update state
  cursorBlock: import('prismarine-block').Block | null = null
  lastDigged: number
  prevBreakState
  currentDigTime
  prevOnGround
  lastBlockPlaced: number
  buttons = [false, false, false]
  lastButtons = [false, false, false]
  breakMeshes = {} as { [key: string]: THREE.Mesh }

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
      blending: THREE.MultiplyBlending
    })
    this.blockBreakMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), breakMaterial)
    this.blockBreakMesh.renderOrder = 999

    // Setup events
    document.addEventListener('mouseup', (e) => {
      this.buttons[e.button] = false
    })

    this.lastBlockPlaced = 4 // ticks since last placed
    document.addEventListener('mousedown', (e) => {
      if (e.isTrusted && !document.pointerLockElement) return
      if (!isGameActive(true)) return
      this.buttons[e.button] = true

      const entity = getEntityCursor()

      if (entity) {
        bot.attack(entity)
      }
    })

    beforeRenderFrame.push(() => {
      if (this.lineMaterial) {
        const { renderer } = viewer
        this.lineMaterial.resolution.set(renderer.domElement.width, renderer.domElement.height)
        this.lineMaterial.dashOffset = performance.now() / 750
      }
    })
  }

  addWorldBreakMesh (position: Vec3, stage: number | null) {
    const posKey = `${position.x},${position.y},${position.z}`
    let mesh = this.breakMeshes[posKey]
    if (stage === null) {
      if (mesh) {
        viewer.scene.remove(mesh)
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.breakMeshes[posKey]
      }
      return
    }

    if (!mesh) {
      mesh = this.blockBreakMesh.clone(true)
      viewer.scene.add(mesh)
      this.breakMeshes[posKey] = mesh

      // #region set position and scale from shape
      const block = bot.world.getBlock(position)
      const allShapes = [...block.shapes, ...block['interactionShapes'] ?? []]
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
      const { position: shapePos, width, height, depth } = getDataFromShape(breakShape)
      mesh.scale.set(width * 1.001, height * 1.001, depth * 1.001)
      shapePos.add(position)
      mesh.position.set(shapePos.x, shapePos.y, shapePos.z)
      // #endregion
    }

    const material = mesh.material as THREE.MeshBasicMaterial
    const oldMap = material.map
    material.map = this.breakTextures[stage] ?? this.breakTextures.at(-1)
    if (oldMap !== material.map) material.needsUpdate = true
  }

  initBot () {
    if (!this.ready) {
      this.ready = true
      this.oneTimeInit()
    }
    assertDefined(viewer)
    bot.on('physicsTick', () => { if (this.lastBlockPlaced < 4) this.lastBlockPlaced++ })
    bot.on('diggingCompleted', () => {
      this.breakStartTime = undefined
    })
    bot.on('diggingAborted', () => {
      this.breakStartTime = undefined
    })
    bot.on('blockBreakProgressObserved', (block, destroyStage) => {
      this.addWorldBreakMesh(block.position, destroyStage)
    })
    bot.on('blockBreakProgressEnd', (block) => {
      this.addWorldBreakMesh(block.position, null)
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
    const cursorBlock = inSpectator && !options.showCursorBlockInSpectator ? null : bot.blockAtCursor(5)
    let cursorBlockDiggable = cursorBlock
    if (cursorBlock && !bot.canDigBlock(cursorBlock) && bot.game.gameMode !== 'creative') cursorBlockDiggable = null

    let cursorChanged = !cursorBlock !== !this.cursorBlock
    if (cursorBlock && this.cursorBlock) {
      cursorChanged = !cursorBlock.position.equals(this.cursorBlock.position)
    }

    // Place / interact / activate
    if (this.buttons[2] && this.lastBlockPlaced >= 4) {
      const activate = bot.heldItem && ['egg', 'fishing_rod', 'firework_rocket',
        'fire_charge', 'snowball', 'ender_pearl', 'experience_bottle', 'potion',
        'glass_bottle', 'bucket', 'water_bucket', 'lava_bucket', 'milk_bucket',
        'minecart', 'boat', 'tnt_minecart', 'chest_minecart', 'hopper_minecart',
        'command_block_minecart', 'armor_stand', 'lead', 'name_tag',
        //
        'writable_book', 'written_book', 'compass', 'clock', 'filled_map', 'empty_map',
        'shears', 'carrot_on_a_stick', 'warped_fungus_on_a_stick',
        'spawn_egg', 'trident', 'crossbow', 'elytra', 'shield', 'turtle_helmet',
      ].includes(bot.heldItem.name)
      if (cursorBlock && !activate) {
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
          bot.activateBlock(cursorBlock, vecArray[cursorBlock.face], delta).finally(() => {
            bot.lookAt = oldLookAt
          }).catch(console.warn)
        }
        this.lastBlockPlaced = 0
      } else {
        bot.activateItem() // todo offhand
      }
    }

    // Stop break
    if (!this.buttons[0] || cursorChanged) {
      stopDigging()
    }

    const onGround = bot.entity.onGround || bot.game.gameMode === 'creative'
    // Start break
    // todo last check doesnt work as cursorChanged happens once (after that check is false)
    if (
      this.buttons[0]
    ) {
      // todo hold mouse state
      if (cursorBlockDiggable
        && (!this.lastButtons[0] || (cursorChanged && Date.now() - (this.lastDigged ?? 0) > 100))) {
        this.currentDigTime = bot.digTime(cursorBlockDiggable)
        this.breakStartTime = performance.now()
        const vecArray = [new Vec3(0, -1, 0), new Vec3(0, 1, 0), new Vec3(0, 0, -1), new Vec3(0, 0, 1), new Vec3(-1, 0, 0), new Vec3(1, 0, 0)]
        //@ts-expect-error
        const blockFace = cursorBlockDiggable.face
        digGlobally(cursorBlockDiggable, blockFace, 'right')
        this.lastDigged = Date.now()
      } else {
        bot.swingArm('right')
      }
    }
    this.prevOnGround = onGround

    // Show cursor
    if (cursorBlock) {
      const allShapes = [...cursorBlock.shapes, ...cursorBlock['interactionShapes'] ?? []]
      this.updateBlockInteractionLines(cursorBlock.position, allShapes.map(shape => {
        return getDataFromShape(shape)
      }))
    } else {
      this.updateBlockInteractionLines(null)
    }

    // Show break animation
    // if (cursorBlockDiggable && this.breakStartTime && bot.game.gameMode !== 'creative') {
    //   const elapsed = performance.now() - this.breakStartTime
    //   const time = bot.digTime(cursorBlockDiggable)
    //   if (time !== this.currentDigTime) {
    //     console.warn('dig time changed! cancelling!', time, 'from', this.currentDigTime) // todo
    //     try { bot.stopDigging() } catch { }
    //   }
    //   const state = Math.floor((elapsed / time) * 10)
    //   //@ts-expect-error
    //   this.blockBreakMesh.material.map = this.breakTextures[state] ?? this.breakTextures.at(-1)
    //   if (state !== this.prevBreakState) {
    //     //@ts-expect-error
    //     this.blockBreakMesh.material.needsUpdate = true
    //   }
    //   this.prevBreakState = state
    //   this.blockBreakMesh.visible = true
    // } else {
    //   this.blockBreakMesh.visible = false
    // }

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

export default new WorldInteraction()
