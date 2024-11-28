import { Entity } from 'prismarine-entity'
import { versionToNumber } from 'prismarine-viewer/viewer/prepare/utils'
import tracker from '@nxg-org/mineflayer-tracker'
import { loader as autoJumpPlugin } from '@nxg-org/mineflayer-auto-jump'
import { subscribeKey } from 'valtio/utils'
import { options, watchValue } from './optionsStorage'
import { miscUiState } from './globalState'


const updateAutoJump = () => {
  if (!bot?.autoJumper) return
  const autoJump = options.autoParkour || (options.autoJump === 'auto' ? miscUiState.currentTouch && !miscUiState.usingGamepadInput : options.autoJump === 'always')
  bot.autoJumper.setOpts({
    jumpIntoWater: options.autoParkour,
    jumpOnAllEdges: options.autoParkour,
    // strictBlockCollision: true,
  })
  if (autoJump === bot.autoJumper.enabled) return
  if (autoJump) {
    bot.autoJumper.enable()
  } else {
    bot.autoJumper.disable()
  }
}
subscribeKey(options, 'autoJump', () => {
  updateAutoJump()
})
subscribeKey(options, 'autoParkour', () => {
  updateAutoJump()
})
subscribeKey(miscUiState, 'usingGamepadInput', () => {
  updateAutoJump()
})
subscribeKey(miscUiState, 'currentTouch', () => {
  updateAutoJump()
})

customEvents.on('gameLoaded', () => {
  bot.loadPlugin(tracker)
  bot.loadPlugin(autoJumpPlugin)
  updateAutoJump()

  // todo cleanup (move to viewer, also shouldnt be used at all)
  const playerPerAnimation = {} as Record<string, string>
  const entityData = (e: Entity) => {
    if (!e.username) return
    window.debugEntityMetadata ??= {}
    window.debugEntityMetadata[e.username] = e
    // todo entity spawn timing issue, check perf
    const playerObject = viewer.entities.entities[e.id]?.playerObject
    if (playerObject) {
      // todo throttle!
      bot.tracker.trackEntity(e)
      playerObject.backEquipment = e.equipment.some((item) => item?.name === 'elytra') ? 'elytra' : 'cape'
      if (playerObject.cape.map === null) {
        playerObject.cape.visible = false
      }
      // todo (easy, important) elytra flying animation
      // todo cleanup states
    }
  }

  let lastCall = 0
  bot.on('physicsTick', () => {
    // throttle, tps: 6
    if (Date.now() - lastCall < 166) return
    lastCall = Date.now()
    for (const [id, { tracking, info }] of Object.entries(bot.tracker.trackingData)) {
      if (!tracking) continue
      const e = bot.entities[id]
      if (!e) continue
      const speed = info.avgSpeed
      const WALKING_SPEED = 0.03
      const SPRINTING_SPEED = 0.18
      const isWalking = Math.abs(speed.x) > WALKING_SPEED || Math.abs(speed.z) > WALKING_SPEED
      const isSprinting = Math.abs(speed.x) > SPRINTING_SPEED || Math.abs(speed.z) > SPRINTING_SPEED
      const newAnimation = isWalking ? (isSprinting ? 'running' : 'walking') : 'idle'
      if (newAnimation !== playerPerAnimation[id]) {
        viewer.entities.playAnimation(e.id, newAnimation)
        playerPerAnimation[id] = newAnimation
      }
    }
  })

  bot.on('entitySwingArm', (e) => {
    if (viewer.entities.entities[e.id]?.playerObject) {
      viewer.entities.playAnimation(e.id, 'oneSwing')
    }
  })

  bot._client.on('damage_event', (data) => {
    const { entityId, sourceTypeId: damage } = data
    if (viewer.entities.entities[entityId]) {
      viewer.entities.handleDamageEvent(entityId, damage)
    }
  })

  bot._client.on('entity_status', (data) => {
    if (versionToNumber(bot.version) >= versionToNumber('1.19.4')) return
    const { entityId, entityStatus } = data
    if (entityStatus === 2 && viewer.entities.entities[entityId]) {
      viewer.entities.handleDamageEvent(entityId, entityStatus)
    }
  })

  const loadedSkinEntityIds = new Set<number>()

  const playerRenderSkin = (e: Entity) => {
    const mesh = viewer.entities.entities[e.id]
    if (!mesh) return
    if (!mesh.playerObject || !options.loadPlayerSkins) return
    const MAX_DISTANCE_SKIN_LOAD = 128
    const distance = e.position.distanceTo(bot.entity.position)
    if (distance < MAX_DISTANCE_SKIN_LOAD && distance < (bot.settings.viewDistance as number) * 16) {
      if (viewer.entities.entities[e.id]) {
        if (loadedSkinEntityIds.has(e.id)) return
        loadedSkinEntityIds.add(e.id)
        viewer.entities.updatePlayerSkin(e.id, e.username, true, true)
      }
    }
  }
  viewer.entities.addListener('remove', (e) => {
    loadedSkinEntityIds.delete(e.id)
    playerPerAnimation[e.id] = ''
    bot.tracker.stopTrackingEntity(e, true)
  })

  bot.on('entityMoved', (e) => {
    playerRenderSkin(e)
    entityData(e)
  })
  bot._client.on('entity_velocity', (packet) => {
    const e = bot.entities[packet.entityId]
    if (!e) return
    entityData(e)
  })

  viewer.entities.addListener('add', (e) => {
    if (!viewer.entities.entities[e.id]) throw new Error('mesh still not loaded')
    playerRenderSkin(e)
  })

  for (const entity of Object.values(bot.entities)) {
    if (entity !== bot.entity) {
      entityData(entity)
    }
  }

  bot.on('entitySpawn', entityData)
  bot.on('entityUpdate', entityData)
  bot.on('entityEquip', entityData)

  watchValue(options, o => {
    viewer.entities.setDebugMode(o.showChunkBorders ? 'basic' : 'none')
  })
})
