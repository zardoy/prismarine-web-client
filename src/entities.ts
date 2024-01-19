import { Entity } from 'prismarine-entity'
import { TextureLoader } from 'three'
import { IdleAnimation, RunningAnimation, WalkingAnimation } from 'skinview3d'
import { options, watchValue } from './optionsStorage'

customEvents.on('gameLoaded', () => {
  const enableSkeletonHelpers = localStorage.enableSkeletonHelpers ?? false
  const entityData = (e: Entity) => {
    if (!e.username) return
    window.debugEntityMetadata ??= {}
    window.debugEntityMetadata[e.username] = e
    // todo entity spawn timing issue, check perf
    if (e.type === 'player') {
      if (viewer.entities.entities[e.id]) {
        const { playerObject } = viewer.entities.entities[e.id]
        playerObject.backEquipment = e.equipment.some((item) => item.name === 'elytra') ? 'elytra' : 'cape'
        // todo
        const WALKING_SPEED = 0.1
        const SPRINTING_SPEED = 0.15
        const isWalking = e.velocity.x > WALKING_SPEED || e.velocity.z > WALKING_SPEED
        const isSprinting = e.velocity.x > SPRINTING_SPEED || e.velocity.z > SPRINTING_SPEED
        // todo switch
        playerObject.animation = isSprinting ? RunningAnimation : isWalking ? WalkingAnimation : IdleAnimation
      }
    }
  }

  const loadedSkinEntityIds = new Set<number>()

  const playerRenderSkin = (e: Entity) => {
    const mesh = viewer.entities.entities[e.id]
    if (!mesh) return
    if (!mesh.playerObject || !options.loadPlayerSkins) return
    const MAX_DISTANCE_SKIN_LOAD = 64
    const distance = e.position.distanceTo(bot.entity.position)
    if (distance < MAX_DISTANCE_SKIN_LOAD && distance < (bot.settings.viewDistance as number) * 16) {
      if (viewer.entities.entities[e.id]) {
        if (loadedSkinEntityIds.has(e.id)) return
        loadedSkinEntityIds.add(e.id)
        viewer.entities.updatePlayerSkin(e.id, true, true)
      }
    }
  }

  bot.on('entityMoved', (e) => {
    playerRenderSkin(e)
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
