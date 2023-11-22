const THREE = require('three')
const TWEEN = require('@tweenjs/tween.js')

const Entity = require('./entity/Entity')
const { dispose3 } = require('./dispose')

function getUsernameTexture(username, { fontFamily = 'sans-serif' }) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

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

function getEntityMesh (entity, scene, options) {
  if (entity.name) {
    try {
      // https://github.com/PrismarineJS/prismarine-viewer/pull/410
      const e = new Entity('1.16.4', entity.name.toLowerCase(), scene)

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

class Entities {
  constructor (scene) {
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

  update (entity) {
    if (!this.entities[entity.id]) {
      const mesh = getEntityMesh(entity, this.scene, this.entitiesOptions)
      if (!mesh) return
      this.entities[entity.id] = mesh
      this.scene.add(mesh)
    }

    const e = this.entities[entity.id]

    if (entity.delete) {
      this.scene.remove(e)
      dispose3(e)
      delete this.entities[entity.id]
    }

    if (entity.pos) {
      new TWEEN.Tween(e.position).to({ x: entity.pos.x, y: entity.pos.y, z: entity.pos.z }, 50).start()
    }
    if (entity.yaw) {
      const da = (entity.yaw - e.rotation.y) % (Math.PI * 2)
      const dy = 2 * da % (Math.PI * 2) - da
      new TWEEN.Tween(e.rotation).to({ y: e.rotation.y + dy }, 50).start()
    }
  }
}

module.exports = { Entities }
