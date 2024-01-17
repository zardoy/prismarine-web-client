//@ts-check
const THREE = require('three')
const TWEEN = require('@tweenjs/tween.js')

const Entity = require('./entity/Entity')
const { dispose3 } = require('./dispose')
const EventEmitter = require('events')
import { PlayerObject } from 'skinview3d'
import { loadSkinToCanvas, loadEarsToCanvasFromSkin, inferModelType, loadCapeToCanvas, loadImage } from 'skinview-utils'
// todo replace with url
import stevePng from 'minecraft-assets/minecraft-assets/data/1.20.2/entity/player/wide/steve.png'

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

function getEntityMesh (entity, scene, options, overrides) {
  if (entity.name) {
    try {
      // https://github.com/PrismarineJS/prismarine-viewer/pull/410
      const entityName = entity.name.toLowerCase()
      const e = new Entity('1.16.4', entityName, scene, overrides)

      if (entity.username !== undefined) {
        const canvas = getUsernameTexture(entity.username, options)
        const tex = new THREE.Texture(canvas)
        tex.needsUpdate = true
        const spriteMat = new THREE.SpriteMaterial({ map: tex })
        const sprite = new THREE.Sprite(spriteMat)
        sprite.renderOrder = 1000
        sprite.scale.set(canvas.width * 0.005, canvas.height * 0.005, 1)
        sprite.position.y += entity.height + 0.6

        e.mesh.add(sprite)
      }
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
  }

  clear () {
    for (const mesh of Object.values(this.entities)) {
      this.scene.remove(mesh)
      dispose3(mesh)
    }
    this.entities = {}
  }

  updatePlayerSkin (entityId, skinUrl, capeUrl = undefined) {
    const getPlayerObject = () => {
      /** @type {PlayerObject} */
      return this.entities[entityId]?.playerObject
    }
    let playerObject = getPlayerObject()
    if (!playerObject) return
    loadImage(skinUrl).then((image) => {
      playerObject = getPlayerObject()
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
      loadEarsToCanvasFromSkin(earsCanvas, skinCanvas)
      const earsTexture = new THREE.CanvasTexture(earsCanvas)
      earsTexture.magFilter = THREE.NearestFilter
      earsTexture.minFilter = THREE.NearestFilter
      earsTexture.needsUpdate = true
      //@ts-ignore
      playerObject.ears.map = earsTexture
    })

    if (capeUrl) {
      loadImage(capeUrl).then((capeImage) => {
        playerObject = getPlayerObject()
        if (!playerObject) return
        const capeCanvas = document.createElement('canvas')
        loadCapeToCanvas(capeCanvas, capeImage)

        const capeTexture = new THREE.CanvasTexture(capeCanvas)
        capeTexture.magFilter = THREE.NearestFilter
        capeTexture.minFilter = THREE.NearestFilter
        capeTexture.needsUpdate = true
        //@ts-ignore
        playerObject.cape.map = capeTexture
        //@ts-ignore
        playerObject.elytra.map = capeTexture
        playerObject.skin.rotation.y = Math.PI
      })
    } else {
      playerObject.backEquipment = null
      playerObject.elytra.map = null
      if (playerObject.cape.map) {
        playerObject.cape.map.dispose()
      }
      playerObject.cape.map = null
    }
  }

  update (/** @type {import('prismarine-entity').Entity & {delete?, pos}} */entity, overrides) {
    if (!this.entities[entity.id]) {
      const group = new THREE.Group()
      let mesh
      if (entity.name === 'player') {
        const wrapper = new THREE.Group()
        const playerObject = new PlayerObject()
        playerObject.position.set(0, 16, 0)

        //@ts-ignore
        wrapper.add(playerObject)
        const scale = 1 / 16
        wrapper.scale.set(scale, scale, scale)

        //@ts-ignore
        group.playerObject = playerObject
        wrapper.rotation.set(0, Math.PI, 0)
        mesh = wrapper
      } else {
        mesh = getEntityMesh(entity, this.scene, this.entitiesOptions, overrides)
      }
      if (!mesh) return
      // set initial position so there are no weird jumps update after
      group.position.set(entity.pos.x, entity.pos.y, entity.pos.z)

      const boxHelper = new THREE.BoxHelper(mesh,
        entity.type === 'hostile' ? 0xff0000 :
          entity.type === 'mob' ? 0x00ff00 :
            entity.type === "player" ? 0x0000ff :
              0xffa500
      )
      group.add(mesh)
      group.add(boxHelper)
      this.scene.add(group)

      this.entities[entity.id] = group

      this.emit('add', entity)

      if (entity.name === 'player') {
        this.updatePlayerSkin(entity.id, stevePng)
      }
    }

    const e = this.entities[entity.id]

    if (e.playerObject && overrides?.rotation?.head) {
      /** @type {PlayerObject} */
      const playerObject = e.playerObject
      const headRotationDiff = overrides.rotation.head.y ? overrides.rotation.head.y - entity.yaw : 0
      playerObject.skin.head.rotation.y = -headRotationDiff
      playerObject.skin.head.rotation.x = overrides.rotation.head.x ? - overrides.rotation.head.x : 0
    }

    if (entity.delete) {
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
