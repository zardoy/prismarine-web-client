//@ts-check
const THREE = require('three')
const TWEEN = require('@tweenjs/tween.js')

const Entity = require('./entity/Entity')
const { dispose3 } = require('./dispose')
const EventEmitter = require('events')
import { PlayerObject, PlayerAnimation } from 'skinview3d'
import { loadSkinToCanvas, loadEarsToCanvasFromSkin, inferModelType, loadCapeToCanvas, loadImage } from 'skinview-utils'
// todo replace with url
import stevePng from 'minecraft-assets/minecraft-assets/data/1.20.2/entity/player/wide/steve.png'
import { WalkingGeneralSwing } from './entity/animations'
import { NameTagObject } from 'skinview3d/libs/nametag'
import { flat, fromFormattedString } from '@xmcl/text-component'
import mojangson from 'mojangson'

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

function getEntityMesh (entity, scene, options, overrides) {
  if (entity.name) {
    try {
      // https://github.com/PrismarineJS/prismarine-viewer/pull/410
      const entityName = entity.name.toLowerCase()
      const e = new Entity('1.16.4', entityName, scene, overrides)

      addNametag(entity, options, e.mesh)
      return e.mesh
    } catch (err) {
      console.log(err)
    }
  }

  const geometry = new THREE.BoxGeometry(entity.width, entity.height, entity.width)
  geometry.translate(0, entity.height / 2, 0)
  const material = new THREE.MeshBasicMaterial({ color: 0xff_00_ff })
  const cube = new THREE.Mesh(geometry, material)
  return cube
}

export class Entities extends EventEmitter {
  constructor (scene) {
    super()
    this.scene = scene
    this.entities = {}
    this.entitiesOptions = {}
    this.debugMode = 'none'
    this.onSkinUpdate = () => { }
    this.clock = new THREE.Clock()
    this.visible = true
  }

  clear () {
    for (const mesh of Object.values(this.entities)) {
      this.scene.remove(mesh)
      dispose3(mesh)
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

  setVisible(visible, /** @type {THREE.Object3D?} */entity = null) {
    this.visible = visible
    for (const mesh of entity ? [entity] : Object.values(this.entities)) {
      mesh.visible = visible
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
      const skinCanvas = document.createElement('canvas')
      loadSkinToCanvas(skinCanvas, image)
      const skinTexture = new THREE.CanvasTexture(skinCanvas)
      skinTexture.magFilter = THREE.NearestFilter
      skinTexture.minFilter = THREE.NearestFilter
      skinTexture.needsUpdate = true
      //@ts-ignore
      playerObject.skin.map = skinTexture
      playerObject.skin.modelType = inferModelType(skinCanvas)

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
        }, () => {})
      }
    }, () => {})


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

  displaySimpleText (jsonLike) {
    if (!jsonLike) return
    const parsed = mojangson.simplify(mojangson.parse(jsonLike))
    const text = flat(parsed).map(x => x.text)
    return text.join('')
  }

  update (/** @type {import('prismarine-entity').Entity & {delete?, pos}} */entity, overrides) {
    if (!this.entities[entity.id] && !entity.delete) {
      const group = new THREE.Group()
      let mesh
      if (entity.name === 'player') {
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

      if (entity.name === 'player') {
        this.updatePlayerSkin(entity.id, '', stevePng)
      }
      this.setDebugMode(this.debugMode, group)
      this.setVisible(this.visible, group)
    }

    //@ts-ignore
    const isInvisible = entity.metadata?.[0] & 0x20
    if (isInvisible) {
      for (const child of this.entities[entity.id].children.find(c => c.name === 'mesh').children) {
        if (child.name !== 'nametag') {
          child.visible = false
        }
      }
    }
    // not player
    const displayText = entity.metadata?.[3] && this.displaySimpleText(entity.metadata[2]);
    if (entity.name !== 'player') {
      addNametag({ ...entity, username: displayText }, this.entitiesOptions, this.entities[entity.id].children.find(c => c.name === 'mesh'))
    }

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
      this.emit('remove', entity)
      this.scene.remove(e)
      dispose3(e)
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
