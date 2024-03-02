import { Entity } from 'prismarine-entity'
import tracker from '@nxg-org/mineflayer-tracker'
import { options, watchValue } from './optionsStorage'

customEvents.on('gameLoaded', () => {
  bot.loadPlugin(tracker)

  // todo cleanup (move to viewer, also shouldnt be used at all)
  const playerPerAnimation = {} as Record<string, string>
  const entityData = (e: Entity) => {
    if (!e.username) return
    window.debugEntityMetadata ??= {}
    window.debugEntityMetadata[e.username] = e
    // todo entity spawn timing issue, check perf
    if (viewer.entities.entities[e.id]?.playerObject) {
      bot.tracker.trackEntity(e)
      const { playerObject } = viewer.entities.entities[e.id]
      playerObject.backEquipment = e.equipment.some((item) => item?.name === 'elytra') ? 'elytra' : 'cape'
      if (playerObject.cape.map === null) {
        playerObject.cape.visible = false
      }
      // todo (easy, important) elytra flying animation
      // todo cleanup states
    }
  }

  bot.on('physicsTick', () => {
    for (const [id, { tracking, info }] of Object.entries(bot.tracker.trackingData)) {
      if (!tracking) continue
      const e = bot.entities[id]!
      const speed = info.avgSpeed
      const WALKING_SPEED = 0.03
      const SPRINTING_SPEED = 0.18
      const isWalking = Math.abs(speed.x) > WALKING_SPEED || Math.abs(speed.z) > WALKING_SPEED
      const isSprinting = Math.abs(speed.x) > SPRINTING_SPEED || Math.abs(speed.z) > SPRINTING_SPEED
      const newAnimation = isWalking ? (isSprinting ? 'running' : 'walking') : 'idle'
      const username = e.username!
      if (newAnimation !== playerPerAnimation[username]) {
        viewer.entities.playAnimation(e.id, newAnimation)
        playerPerAnimation[username] = newAnimation
      }
    }
  })

  bot.on('entitySwingArm', (e) => {
    if (viewer.entities.entities[e.id]?.playerObject) {
      viewer.entities.playAnimation(e.id, 'oneSwing')
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
    playerPerAnimation[e.username] = ''
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
