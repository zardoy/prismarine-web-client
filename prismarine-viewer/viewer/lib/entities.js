//@ts-check
import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import * as Entity from './entity/EntityMesh'
import nbt from 'prismarine-nbt'
import EventEmitter from 'events'
import { PlayerObject, PlayerAnimation } from 'skinview3d'
import { loadSkinToCanvas, loadEarsToCanvasFromSkin, inferModelType, loadCapeToCanvas, loadImage } from 'skinview-utils'
// todo replace with url
import stevePng from 'mc-assets/dist/other-textures/latest/entity/player/wide/steve.png'
import { WalkingGeneralSwing } from './entity/animations'
import { NameTagObject } from 'skinview3d/libs/nametag'
import { flat, fromFormattedString } from '@xmcl/text-component'
import mojangson from 'mojangson'
import externalTexturesJson from './entity/externalTextures.json'
import { disposeObject } from './threeJsUtils'

export const TWEEN_DURATION = 50 // todo should be 100

function getUsernameTexture (username, { fontFamily = 'sans-serif' }) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2d context')

  const fontSize = 50
  const padding = 5
  ctx.font = `${fontSize}px ${fontFamily}`

  const textWidth = ctx.measureText(username).width + padding * 2

  canvas.width = textWidth
  canvas.height = fontSize + padding * 2

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.fillStyle = 'white'
  ctx.fillText(username, padding, fontSize)

  return canvas
}

const addNametag = (entity, options, mesh) => {
  if (entity.username !== undefined) {
    if (mesh.children.find(c => c.name === 'nametag')) return // todo update
    const canvas = getUsernameTexture(entity.username, options)
    const tex = new THREE.Texture(canvas)
    tex.needsUpdate = true
    const spriteMat = new THREE.SpriteMaterial({ map: tex })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.renderOrder = 1000
    sprite.scale.set(canvas.width * 0.005, canvas.height * 0.005, 1)
    sprite.position.y += entity.height + 0.6
    sprite.name = 'nametag'

    mesh.add(sprite)
  }
}

// todo cleanup
const nametags = {}

function getEntityMesh (entity, scene, options, overrides) {
  if (entity.name) {
    try {
      // https://github.com/PrismarineJS/prismarine-viewer/pull/410
      const entityName = entity.name.toLowerCase()
      const e = new Entity.EntityMesh('1.16.4', entityName, scene, overrides)

      if (e.mesh) {
        addNametag(entity, options, e.mesh)
        return e.mesh
      }
    } catch (err) {
      reportError?.(err)
    }
  }

  const geometry = new THREE.BoxGeometry(entity.width, entity.height, entity.width)
  geometry.translate(0, entity.height / 2, 0)
  const material = new THREE.MeshBasicMaterial({ color: 0xff_00_ff })
  const cube = new THREE.Mesh(geometry, material)
  const nametagCount = (nametags[entity.name] = (nametags[entity.name] || 0) + 1)
  if (nametagCount < 6) {
    addNametag({
      username: entity.name,
      height: entity.height,
    }, options, cube)
  }
  return cube
}

export class Entities extends EventEmitter {
  constructor(scene) {
    super()
    /** @type {THREE.Scene} */
    this.scene = scene
    this.entities = {}
    this.entitiesOptions = {}
    this.debugMode = 'none'
    this.onSkinUpdate = () => { }
    this.clock = new THREE.Clock()
    this.rendering = true
    this.itemsTexture = null
    this.getItemUv = undefined
  }

  clear () {
    for (const mesh of Object.values(this.entities)) {
      this.scene.remove(mesh)
      disposeObject(mesh)
    }
    this.entities = {}
  }

  setDebugMode (mode, /** @type {THREE.Object3D?} */entity = null) {
    this.debugMode = mode
    for (const mesh of entity ? [entity] : Object.values(this.entities)) {
      const boxHelper = mesh.children.find(c => c.name === 'debug')
      boxHelper.visible = false
      if (this.debugMode === 'basic') {
        boxHelper.visible = true
      }
      // todo advanced
    }
  }

  setRendering (rendering, /** @type {THREE.Object3D?} */entity = null) {
    this.rendering = rendering
    for (const ent of entity ? [entity] : Object.values(this.entities)) {
      if (rendering) {
        if (!this.scene.children.includes(ent)) this.scene.add(ent)
      } else {
        this.scene.remove(ent)
      }
    }
  }

  render () {
    const dt = this.clock.getDelta()
    for (const entityId of Object.keys(this.entities)) {
      const playerObject = this.getPlayerObject(entityId)
      if (playerObject?.animation) {
        playerObject.animation.update(playerObject, dt)
      }
    }
  }

  getPlayerObject (entityId) {
    /** @type {(PlayerObject & { animation?: PlayerAnimation }) | undefined} */
    const playerObject = this.entities[entityId]?.playerObject
    return playerObject
  }

  // fixme workaround
  defaultSteveTexture

  // true means use default skin url
  updatePlayerSkin (entityId, username, /** @type {string | true} */skinUrl, /** @type {string | true | undefined} */capeUrl = undefined) {
    let playerObject = this.getPlayerObject(entityId)
    if (!playerObject) return
    // const username = this.entities[entityId].username
    // or https://mulv.vercel.app/
    if (skinUrl === true) {
      skinUrl = `https://mulv.tycrek.dev/api/lookup?username=${username}&type=skin`
      if (!username) return
    }
    loadImage(skinUrl).then((image) => {
      playerObject = this.getPlayerObject(entityId)
      if (!playerObject) return
      /** @type {THREE.CanvasTexture} */
      let skinTexture
      if (skinUrl === stevePng && this.defaultSteveTexture) {
        skinTexture = this.defaultSteveTexture
      } else {
        const skinCanvas = document.createElement('canvas')
        loadSkinToCanvas(skinCanvas, image)
        skinTexture = new THREE.CanvasTexture(skinCanvas)
        if (skinUrl === stevePng) {
          this.defaultSteveTexture = skinTexture
        }
      }
      skinTexture.magFilter = THREE.NearestFilter
      skinTexture.minFilter = THREE.NearestFilter
      skinTexture.needsUpdate = true
      //@ts-ignore
      playerObject.skin.map = skinTexture
      playerObject.skin.modelType = inferModelType(skinTexture.image)

      const earsCanvas = document.createElement('canvas')
      loadEarsToCanvasFromSkin(earsCanvas, image)
      if (!isCanvasBlank(earsCanvas)) {
        const earsTexture = new THREE.CanvasTexture(earsCanvas)
        earsTexture.magFilter = THREE.NearestFilter
        earsTexture.minFilter = THREE.NearestFilter
        earsTexture.needsUpdate = true
        //@ts-ignore
        playerObject.ears.map = earsTexture
        playerObject.ears.visible = true
      } else {
        playerObject.ears.map = null
        playerObject.ears.visible = false
      }
      this.onSkinUpdate?.()
      if (capeUrl) {
        if (capeUrl === true) capeUrl = `https://mulv.tycrek.dev/api/lookup?username=${username}&type=cape`
        loadImage(capeUrl).then((capeImage) => {
          playerObject = this.getPlayerObject(entityId)
          if (!playerObject) return
          const capeCanvas = document.createElement('canvas')
          loadCapeToCanvas(capeCanvas, capeImage)

          const capeTexture = new THREE.CanvasTexture(capeCanvas)
          capeTexture.magFilter = THREE.NearestFilter
          capeTexture.minFilter = THREE.NearestFilter
          capeTexture.needsUpdate = true
          //@ts-ignore
          playerObject.cape.map = capeTexture
          playerObject.cape.visible = true
          //@ts-ignore
          playerObject.elytra.map = capeTexture
          this.onSkinUpdate?.()

          if (!playerObject.backEquipment) {
            playerObject.backEquipment = 'cape'
          }
        }, () => { })
      }
    }, () => { })


    playerObject.cape.visible = false
    if (!capeUrl) {
      playerObject.backEquipment = null
      playerObject.elytra.map = null
      if (playerObject.cape.map) {
        playerObject.cape.map.dispose()
      }
      playerObject.cape.map = null
    }

    function isCanvasBlank (canvas) {
      return !canvas.getContext('2d')
        .getImageData(0, 0, canvas.width, canvas.height).data
        .some(channel => channel !== 0)
    }
  }

  playAnimation (entityPlayerId, /** @type {'walking' | 'running' | 'oneSwing' | 'idle'} */animation) {
    const playerObject = this.getPlayerObject(entityPlayerId)
    if (!playerObject) return

    if (animation === 'oneSwing') {
      if (!(playerObject.animation instanceof WalkingGeneralSwing)) throw new Error('Expected WalkingGeneralSwing')
      playerObject.animation.swingArm()
      return
    }

    if (playerObject.animation instanceof WalkingGeneralSwing) {
      playerObject.animation.switchAnimationCallback = () => {
        if (!(playerObject.animation instanceof WalkingGeneralSwing)) throw new Error('Expected WalkingGeneralSwing')
        playerObject.animation.isMoving = animation !== 'idle'
        playerObject.animation.isRunning = animation === 'running'
      }
    }

  }

  parseEntityLabel (jsonLike) {
    if (!jsonLike) return
    try {
      const parsed = typeof jsonLike === 'string' ? mojangson.simplify(mojangson.parse(jsonLike)) : nbt.simplify(jsonLike)
      const text = flat(parsed).map(x => x.text)
      return text.join('')
    } catch (err) {
      return jsonLike
    }
  }

  update (/** @type {import('prismarine-entity').Entity & {delete?, pos}} */entity, overrides) {
    let isPlayerModel = entity.name === 'player'
    if (entity.name === 'zombie' || entity.name === 'zombie_villager' || entity.name === 'husk') {
      isPlayerModel = true
      overrides.texture = `textures/1.16.4/entity/${entity.name === 'zombie_villager' ? 'zombie_villager/zombie_villager.png' : `zombie/${entity.name}.png`}`
    }
    if (!this.entities[entity.id] && !entity.delete) {
      const group = new THREE.Group()
      let mesh
      if (entity.name === 'item') {
        /** @type {any} */
        //@ts-ignore
        const item = entity.metadata?.find(m => typeof m === 'object' && m !== null && m.itemCount)
        if (item) {
          const textureUv = this.getItemUv?.(item.itemId ?? item.blockId)
          if (textureUv) {
            // todo use geometry buffer uv instead!
            const { u, v, size, su, sv, texture } = textureUv
            const itemsTexture = texture.clone()
            itemsTexture.flipY = true
            itemsTexture.offset.set(u, 1 - v - (sv ?? size))
            itemsTexture.repeat.set(su ?? size, sv ?? size)
            itemsTexture.needsUpdate = true
            itemsTexture.magFilter = THREE.NearestFilter
            itemsTexture.minFilter = THREE.NearestFilter
            const itemsTextureFlipped = itemsTexture.clone()
            itemsTextureFlipped.repeat.x *= -1
            itemsTextureFlipped.needsUpdate = true
            itemsTextureFlipped.offset.set(u + (su ?? size), 1 - v - (sv ?? size))
            const material = new THREE.MeshStandardMaterial({
              map: itemsTexture,
              transparent: true,
              alphaTest: 0.1,
            })
            const materialFlipped = new THREE.MeshStandardMaterial({
              map: itemsTextureFlipped,
              transparent: true,
              alphaTest: 0.1,
            })
            mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.0), [
              // top left and right bottom are black box materials others are transparent
              new THREE.MeshBasicMaterial({ color: 0x000000 }), new THREE.MeshBasicMaterial({ color: 0x000000 }),
              new THREE.MeshBasicMaterial({ color: 0x000000 }), new THREE.MeshBasicMaterial({ color: 0x000000 }),
              material, materialFlipped
            ])
            mesh.scale.set(0.5, 0.5, 0.5)
            mesh.position.set(0, 0.2, 0)
            // set faces
            // mesh.position.set(targetPos.x + 0.5 + 2, targetPos.y + 0.5, targetPos.z + 0.5)
            // viewer.scene.add(mesh)
            const clock = new THREE.Clock()
            mesh.onBeforeRender = () => {
              const delta = clock.getDelta()
              mesh.rotation.y += delta
            }
            //@ts-ignore
            group.additionalCleanup = () => {
              // important: avoid texture memory leak and gpu slowdown
              itemsTexture.dispose()
              itemsTextureFlipped.dispose()
            }
          }
        }
      } else if (isPlayerModel) {
        // CREATE NEW PLAYER ENTITY
        const wrapper = new THREE.Group()
        /** @type {PlayerObject & { animation?: PlayerAnimation }} */
        const playerObject = new PlayerObject()
        playerObject.position.set(0, 16, 0)

        //@ts-ignore
        wrapper.add(playerObject)
        const scale = 1 / 16
        wrapper.scale.set(scale, scale, scale)

        if (entity.username) {
          // todo proper colors
          const nameTag = new NameTagObject(fromFormattedString(entity.username).text, {
            font: `48px ${this.entitiesOptions.fontFamily}`,
          })
          nameTag.position.y = playerObject.position.y + playerObject.scale.y * 16 + 3
          nameTag.renderOrder = 1000

          //@ts-ignore
          wrapper.add(nameTag)
        }

        //@ts-ignore
        group.playerObject = playerObject
        wrapper.rotation.set(0, Math.PI, 0)
        mesh = wrapper
        playerObject.animation = new WalkingGeneralSwing()
        //@ts-ignore
        playerObject.animation.isMoving = false
      } else {
        mesh = getEntityMesh(entity, this.scene, this.entitiesOptions, overrides)
      }
      if (!mesh) return
      mesh.name = 'mesh'
      // set initial position so there are no weird jumps update after
      group.position.set(entity.pos.x, entity.pos.y, entity.pos.z)

      // todo use width and height instead
      const boxHelper = new THREE.BoxHelper(mesh,
        entity.type === 'hostile' ? 0xff0000 :
          entity.type === 'mob' ? 0x00ff00 :
            entity.type === "player" ? 0x0000ff :
              0xffa500
      )
      boxHelper.name = 'debug'
      group.add(mesh)
      group.add(boxHelper)
      boxHelper.visible = false
      this.scene.add(group)

      this.entities[entity.id] = group

      this.emit('add', entity)

      if (isPlayerModel) {
        this.updatePlayerSkin(entity.id, '', overrides?.texture || stevePng)
      }
      this.setDebugMode(this.debugMode, group)
      this.setRendering(this.rendering, group)
    }

    //@ts-ignore
    // set visibility
    const isInvisible = entity.metadata?.[0] & 0x20
    for (const child of this.entities[entity.id].children.find(c => c.name === 'mesh').children) {
      if (child.name !== 'nametag') {
        child.visible = !isInvisible
      }
    }
    // ---
    // not player
    const displayText = entity.metadata?.[3] && this.parseEntityLabel(entity.metadata[2])
    if (entity.name !== 'player' && displayText) {
      addNametag({ ...entity, username: displayText }, this.entitiesOptions, this.entities[entity.id].children.find(c => c.name === 'mesh'))
    }

    // todo handle map, map_chunks events
    // if (entity.name === 'item_frame' || entity.name === 'glow_item_frame') {
    //   const example = {
    //     "present": true,
    //     "itemId": 847,
    //     "itemCount": 1,
    //     "nbtData": {
    //         "type": "compound",
    //         "name": "",
    //         "value": {
    //             "map": {
    //                 "type": "int",
    //                 "value": 2146483444
    //             },
    //             "interactiveboard": {
    //                 "type": "byte",
    //                 "value": 1
    //             }
    //         }
    //     }
    // }
    //   const item = entity.metadata?.[8]
    //   if (item.nbtData) {
    //     const nbt = nbt.simplify(item.nbtData)
    //   }
    // }

    // this can be undefined in case where packet entity_destroy was sent twice (so it was already deleted)
    const e = this.entities[entity.id]

    if (entity.username) {
      e.username = entity.username
    }

    if (e?.playerObject && overrides?.rotation?.head) {
      /** @type {PlayerObject} */
      const playerObject = e.playerObject
      const headRotationDiff = overrides.rotation.head.y ? overrides.rotation.head.y - entity.yaw : 0
      playerObject.skin.head.rotation.y = -headRotationDiff
      playerObject.skin.head.rotation.x = overrides.rotation.head.x ? - overrides.rotation.head.x : 0
    }

    if (entity.delete && e) {
      if (e.additionalCleanup) e.additionalCleanup()
      this.emit('remove', entity)
      this.scene.remove(e)
      disposeObject(e)
      // todo dispose textures as well ?
      delete this.entities[entity.id]
    }

    if (entity.pos) {
      new TWEEN.Tween(e.position).to({ x: entity.pos.x, y: entity.pos.y, z: entity.pos.z }, TWEEN_DURATION).start()
    }
    if (entity.yaw) {
      const da = (entity.yaw - e.rotation.y) % (Math.PI * 2)
      const dy = 2 * da % (Math.PI * 2) - da
      new TWEEN.Tween(e.rotation).to({ y: e.rotation.y + dy }, TWEEN_DURATION).start()
    }
  }
}
