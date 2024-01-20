import { Entity } from 'prismarine-entity'
import { options, watchValue } from './optionsStorage'

customEvents.on('gameLoaded', () => {
  // todo cleanup (move to viewer, also shouldnt be used at all)
  const playerPerAnimation = {} as Record<string, string>
  const entityData = (e: Entity) => {
    if (!e.username) return
    window.debugEntityMetadata ??= {}
    window.debugEntityMetadata[e.username] = e
    // todo entity spawn timing issue, check perf
    if (viewer.entities.entities[e.id]?.playerObject) {
      const { playerObject } = viewer.entities.entities[e.id]
      playerObject.backEquipment = e.equipment.some((item) => item?.name === 'elytra') ? 'elytra' : 'cape'
      if (playerObject.cape.map === null) {
        playerObject.cape.visible = false
      }
      // todo (easy, important) elytra flying animation
      // todo cleanup states
      const WALKING_SPEED = 0.1
      const SPRINTING_SPEED = 0.15
      const isWalking = Math.abs(e.velocity.x) > WALKING_SPEED || Math.abs(e.velocity.z) > WALKING_SPEED
      const isSprinting = Math.abs(e.velocity.x) > SPRINTING_SPEED || Math.abs(e.velocity.z) > SPRINTING_SPEED
      const newAnimation = isWalking ? (isSprinting ? 'running' : 'walking') : 'idle'
      if (newAnimation !== playerPerAnimation[e.username]) {
        viewer.entities.playAnimation(e.id, newAnimation)
        playerPerAnimation[e.username] = newAnimation
      }
    }
  }

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
