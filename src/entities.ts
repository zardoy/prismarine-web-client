import { Entity } from 'prismarine-entity'
import { TextureLoader } from 'three'
import { options, watchValue } from './optionsStorage'

customEvents.on('gameLoaded', () => {
  const enableSkeletonHelpers = localStorage.enableSkeletonHelpers ?? false
  const entityData = (e: Entity) => {
    if (!e.username) return
    // const firstRender = !!window.debugEntityMetadata
    window.debugEntityMetadata ??= {}
    window.debugEntityMetadata[e.username] = e
  }

  const entityFirstRendered = (e) => {
    const mesh = viewer.entities.entities[e.id]
    if (!mesh) throw new Error('mesh still not loaded')
    // const visitChildren = (obj) => {
    //   if (!Array.isArray(obj?.children)) return
    //   const { children, isSkeletonHelper } = obj
    //   if (isSkeletonHelper && enableSkeletonHelpers) {
    //     obj.visible = true
    //   }
    //   if (e.type === 'player' && e.username) {
    //     if (obj.name === 'geometry_default') {
    //       console.log('request', e.uuid)
    //       new TextureLoader().load(`https://mulv.tycrek.dev/api/lookup?username=${e.username}&type=skin`, (texture) => {
    //         texture.magFilter = THREE.NearestFilter
    //         texture.minFilter = THREE.NearestFilter
    //         texture.flipY = false
    //         texture.wrapS = THREE.RepeatWrapping
    //         texture.wrapT = THREE.RepeatWrapping
    //         obj.material.map = texture
    //       })
    //     }
    //     if (obj.name === 'geometry_cape') {
    //       // todo
    //     }
    //   }
    //   for (const child of children) {
    //     if (typeof child === 'object') visitChildren(child)
    //   }
    // }
    // visitChildren(mesh)
    if (mesh.playerObject && options.loadPlayerSkins) {
      viewer.entities.updatePlayerSkin(e.id, `https://mulv.tycrek.dev/api/lookup?username=${e.username}&type=skin`)
    }
  }

  window.debugSkin = () => {
    const entity = Object.values(bot.entities).find((e) => e.type === 'player' && bot.entity !== e)
    if (!entity) return
    entityFirstRendered(entity)
  }

  viewer.entities.addListener('add', entityFirstRendered)

  for (const entity of Object.values(bot.entities)) {
    if (entity !== bot.entity) {
      entityData(entity)
    }
  }

  bot.on('entitySpawn', entityData)
  bot.on('entityUpdate', entityData)

  watchValue(options, o => {
    viewer.entities.setDebugMode(o.showChunkBorders ? 'basic' : 'none')
  })
})
