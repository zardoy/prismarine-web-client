//@ts-check
import * as THREE from 'three'
import { OBJLoader } from 'three-stdlib'
import huskPng from 'mc-assets/dist/other-textures/latest/entity/zombie/husk.png'
import { Vec3 } from 'vec3'
import entities from './entities.json'
import { externalModels } from './objModels'
import externalTexturesJson from './externalTextures.json'
// import { loadTexture } from globalThis.isElectron ? '../utils.electron.js' : '../utils';
const { loadTexture } = globalThis.isElectron ? require('../utils.electron.js') : require('../utils')

const elemFaces = {
  up: {
    dir: [0, 1, 0],
    u0: [0, 0, 1],
    v0: [0, 0, 0],
    u1: [1, 0, 1],
    v1: [0, 0, 1],
    corners: [
      [0, 1, 1, 0, 0],
      [1, 1, 1, 1, 0],
      [0, 1, 0, 0, 1],
      [1, 1, 0, 1, 1]
    ]
  },
  down: {
    dir: [0, -1, 0],
    u0: [1, 0, 1],
    v0: [0, 0, 0],
    u1: [2, 0, 1],
    v1: [0, 0, 1],
    corners: [
      [1, 0, 1, 0, 0],
      [0, 0, 1, 1, 0],
      [1, 0, 0, 0, 1],
      [0, 0, 0, 1, 1]
    ]
  },
  east: {
    dir: [1, 0, 0],
    u0: [0, 0, 0],
    v0: [0, 0, 1],
    u1: [0, 0, 1],
    v1: [0, 1, 1],
    corners: [
      [1, 1, 1, 0, 0],
      [1, 0, 1, 0, 1],
      [1, 1, 0, 1, 0],
      [1, 0, 0, 1, 1]
    ]
  },
  west: {
    dir: [-1, 0, 0],
    u0: [1, 0, 1],
    v0: [0, 0, 1],
    u1: [1, 0, 2],
    v1: [0, 1, 1],
    corners: [
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 1, 1]
    ]
  },
  north: {
    dir: [0, 0, -1],
    u0: [0, 0, 1],
    v0: [0, 0, 1],
    u1: [1, 0, 1],
    v1: [0, 1, 1],
    corners: [
      [1, 0, 0, 0, 1],
      [0, 0, 0, 1, 1],
      [1, 1, 0, 0, 0],
      [0, 1, 0, 1, 0]
    ]
  },
  south: {
    dir: [0, 0, 1],
    u0: [1, 0, 2],
    v0: [0, 0, 1],
    u1: [2, 0, 2],
    v1: [0, 1, 1],
    corners: [
      [0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1],
      [0, 1, 1, 0, 0],
      [1, 1, 1, 1, 0]
    ]
  }
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function addCube(attr, boneId, bone, cube, sameTextureForAllFaces = false, texWidth = 64, texHeight = 64, mirror = false) {
  const cubeRotation = new THREE.Euler(0, 0, 0)
  if (cube.rotation) {
    cubeRotation.x = -cube.rotation[0] * Math.PI / 180
    cubeRotation.y = -cube.rotation[1] * Math.PI / 180
    cubeRotation.z = -cube.rotation[2] * Math.PI / 180
  }
  for (const { dir, corners, u0, v0, u1, v1 } of Object.values(elemFaces)) {
    const ndx = Math.floor(attr.positions.length / 3)

    const eastOrWest = dir[0] !== 0
    const faceUvs = []
    for (const pos of corners) {
      let u
      let v
      if (sameTextureForAllFaces) {
        u = (cube.uv[0] + pos[3] * cube.size[0]) / texWidth
        v = (cube.uv[1] + pos[4] * cube.size[1]) / texHeight
      } else {
        u = (cube.uv[0] + dot(pos[3] ? u1 : u0, cube.size)) / texWidth
        v = (cube.uv[1] + dot(pos[4] ? v1 : v0, cube.size)) / texHeight
      }

      const posX = eastOrWest && mirror ? pos[0] ^ 1 : pos[0]
      const posY = pos[1]
      const posZ = eastOrWest && mirror ? pos[2] ^ 1 : pos[2]
      const inflate = cube.inflate ?? 0
      let vecPos = new THREE.Vector3(
        cube.origin[0] + posX * cube.size[0] + (posX ? inflate : -inflate),
        cube.origin[1] + posY * cube.size[1] + (posY ? inflate : -inflate),
        cube.origin[2] + posZ * cube.size[2] + (posZ ? inflate : -inflate)
      )

      vecPos = vecPos.applyEuler(cubeRotation)
      vecPos = vecPos.sub(bone.position)
      vecPos = vecPos.applyEuler(bone.rotation)
      vecPos = vecPos.add(bone.position)

      attr.positions.push(vecPos.x, vecPos.y, vecPos.z)
      attr.normals.push(...dir)
      faceUvs.push(u, v)
      attr.skinIndices.push(boneId, 0, 0, 0)
      attr.skinWeights.push(1, 0, 0, 0)
    }

    if (mirror) {
      for (let i = 0; i + 1 < corners.length; i += 2) {
        const faceIndex = i * 2
        const tempFaceUvs = faceUvs.slice(faceIndex, faceIndex + 4)
        faceUvs[faceIndex] = tempFaceUvs[2]
        faceUvs[faceIndex + 1] = tempFaceUvs[eastOrWest ? 1 : 3]
        faceUvs[faceIndex + 2] = tempFaceUvs[0]
        faceUvs[faceIndex + 3] = tempFaceUvs[eastOrWest ? 3 : 1]
      }
    }
    attr.uvs.push(...faceUvs)

    attr.indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3)
  }
}

export function getMesh(worldRenderer, texture, jsonModel, overrides = {}) {
  let textureWidth = jsonModel.texturewidth ?? 64
  let textureHeight = jsonModel.textureheight ?? 64
  let textureOffset
  const useBlockTexture = texture.startsWith('block:')
  if (useBlockTexture) {
    const blockName = texture.slice(6)
    const textureInfo = worldRenderer.blocksAtlasParser.getTextureInfo(blockName)
    if (textureInfo) {
      textureWidth = worldRenderer.material.map.image.width
      textureHeight = worldRenderer.material.map.image.height
      textureOffset = [textureInfo.u, textureInfo.v]
    } else {
      console.error(`Unknown block ${blockName}`)
    }
  }

  const bones = {}

  const geoData = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
    skinIndices: [],
    skinWeights: []
  }
  let i = 0
  for (const jsonBone of jsonModel.bones) {
    const bone = new THREE.Bone()
    if (jsonBone.pivot) {
      bone.position.x = jsonBone.pivot[0]
      bone.position.y = jsonBone.pivot[1]
      bone.position.z = jsonBone.pivot[2]
    }
    if (jsonBone.bind_pose_rotation) {
      bone.rotation.x = -jsonBone.bind_pose_rotation[0] * Math.PI / 180
      bone.rotation.y = -jsonBone.bind_pose_rotation[1] * Math.PI / 180
      bone.rotation.z = -jsonBone.bind_pose_rotation[2] * Math.PI / 180
    } else if (jsonBone.rotation) {
      bone.rotation.x = -jsonBone.rotation[0] * Math.PI / 180
      bone.rotation.y = -jsonBone.rotation[1] * Math.PI / 180
      bone.rotation.z = -jsonBone.rotation[2] * Math.PI / 180
    }
    if (overrides.rotation?.[jsonBone.name]) {
      bone.rotation.x -= (overrides.rotation[jsonBone.name].x ?? 0) * Math.PI / 180
      bone.rotation.y -= (overrides.rotation[jsonBone.name].y ?? 0) * Math.PI / 180
      bone.rotation.z -= (overrides.rotation[jsonBone.name].z ?? 0) * Math.PI / 180
    }
    bone.name = `bone_${jsonBone.name}`
    bones[jsonBone.name] = bone

    if (jsonBone.cubes) {
      for (const cube of jsonBone.cubes) {
        addCube(geoData, i, bone, cube, useBlockTexture, textureWidth, textureHeight, jsonBone.mirror)
      }
    }
    i++
  }

  const rootBones = []
  for (const jsonBone of jsonModel.bones) {
    if (jsonBone.parent && bones[jsonBone.parent]) { bones[jsonBone.parent].add(bones[jsonBone.name]) } else {
      rootBones.push(bones[jsonBone.name])
    }
  }

  const skeleton = new THREE.Skeleton(Object.values(bones))

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(geoData.positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(geoData.normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(geoData.uvs, 2))
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(geoData.skinIndices, 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(geoData.skinWeights, 4))
  geometry.setIndex(geoData.indices)

  const material = new THREE.MeshLambertMaterial({ transparent: true, alphaTest: 0.1 })
  const mesh = new THREE.SkinnedMesh(geometry, material)
  mesh.add(...rootBones)
  mesh.bind(skeleton)
  mesh.scale.set(1 / 16, 1 / 16, 1 / 16)

  if (textureOffset) {
    texture = worldRenderer.material.map.clone()
    texture.offset.set(textureOffset[0], textureOffset[1])
    texture.needsUpdate = true
    material.map = texture
  } else {
    loadTexture(texture.endsWith('.png') || texture.startsWith('data:image/') ? texture : texture + '.png', texture => {
      if (material.map) {
        // texture is already loaded
        return
      }
      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter
      texture.flipY = false
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      material.map = texture
    })
  }

  return mesh
}

export const knownNotHandled = [
  'area_effect_cloud', 'block_display',
  'chest_boat', 'end_crystal',
  'falling_block', 'furnace_minecart',
  'giant', 'glow_item_frame',
  'glow_squid', 'illusioner',
  'interaction', 'item',
  'item_display', 'item_frame',
  'lightning_bolt', 'marker',
  'painting', 'spawner_minecart',
  'spectral_arrow', 'tnt',
  'trader_llama', 'zombie_horse'
]

export const temporaryMap = {
  'furnace_minecart': 'minecart',
  'spawner_minecart': 'minecart',
  'chest_minecart': 'minecart',
  'hopper_minecart': 'minecart',
  'command_block_minecart': 'minecart',
  'tnt_minecart': 'minecart',
  'glow_item_frame': 'item_frame',
  'glow_squid': 'squid',
  'trader_llama': 'llama',
  'chest_boat': 'boat',
  'spectral_arrow': 'arrow',
  'husk': 'zombie',
  'zombie_horse': 'horse',
  'donkey': 'horse',
  'skeleton_horse': 'horse',
  'mule': 'horse',
  'ocelot': 'cat',
  // 'falling_block': 'block',
  // 'lightning_bolt': 'lightning',
}

const getEntity = (name) => {
  return entities[name]
}

// const externalModelsTextures = {
//   allay: 'allay/allay',
//   axolotl: 'axolotl/axolotl_blue',
//   blaze: 'blaze',
//   camel: 'camel/camel',
//   cat: 'cat/black',
//   chicken: 'chicken',
//   cod: 'fish/cod',
//   creeper: 'creeper/creeper',
//   dolphin: 'dolphin',
//   ender_dragon: 'enderdragon/dragon',
//   enderman: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAABGdBTUEAALGPC/xhBQAAAY5JREFUaN7lWNESgzAI8yv8/z/tXjZPHSShYitb73rXedo1AQJ0WchY17WhudQZ7TS18Qb5AXtY/yUBO8tXIaCRqRNwXlcgwDJgmAALfBUP8AjYEdHnAZUIAGdvPy+CnobJIVw9DVIPEABawuEyyvYx1sMIMP8fAbUO7ukBImZmCCEP2AhglnRip8vio7MIxYEsaVkdeYNjYfbN/BBA1twP9AxpB0qlMwj48gBP5Ji1rXc8nfBImk6A5+KqShNwdTwgKy0xYRzdS4yoY651W8EDRwGVJEDVITGtjiEAaEBq3o4SwGqRVAKsdVYIsAzDCACV6VwCFMBCpqLvgudzQ6CnjL5afmeX4pdE0LIQuYCBzZbQfT4rC6COUQGn9B3MQ28pSIxDSDdNrKdQSZJ7lDurMeZm6iEjKVENh8cQgBowBFK5gEHhsO3xFA/oKXp6vg8RoHaD2QRkiaDnAYcZAcB+E6GTRVAhQCVJyVImKOUiBLW3KL4jzU2POHp64RIQ/ADO6D6Ry1gl9tlN1Xm+AK8s2jHadDijAAAAAElFTkSuQmCC',
//   endermite: 'endermite',
//   fox: 'fox/fox',
//   frog: 'frog/cold_frog',
//   ghast: 'ghast/ghast',
//   goat: 'goat/goat',
//   guardian: 'guardian',
//   horse: 'horse/horse_brown',
//   llama: 'llama/creamy',
//   minecart: 'minecart',
//   parrot: 'parrot/parrot_grey',
//   piglin: 'piglin/piglin',
//   pillager: 'illager/pillager',
//   rabbit: 'rabbit/brown',
//   sheep: 'sheep/sheep',
//   shulker: 'shulker/shulker',
//   sniffer: 'sniffer/sniffer',
//   spider: 'spider/spider',
//   tadpole: 'tadpole/tadpole',
//   turtle: 'turtle/big_sea_turtle',
//   vex: 'illager/vex',
//   villager: 'villager/villager',
//   warden: 'warden/warden',
//   witch: 'witch',
//   wolf: 'wolf/wolf',
//   zombie_villager: 'zombie_villager/zombie_villager'
// }

const scaleEntity = {
  zombie: 1.85,
  husk: 1.85
}
const offsetEntity = {
  zombie: new Vec3(0, 1, 0),
  husk: new Vec3(0, 1, 0),
  boat: new Vec3(0, -1, 0),
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class EntityMesh {
  constructor(version, type, worldRenderer, /** @type {{textures?, rotation?: Record<string, {x,y,z}>}} */overrides = {}) {
    const originalType = type
    const mappedValue = temporaryMap[type]
    if (mappedValue) type = mappedValue

    if (externalModels[type]) {
      const objLoader = new OBJLoader()
      let texturePath = externalTexturesJson[type]
      if (originalType === 'zombie_horse') {
        texturePath = `textures/${version}/entity/horse/horse_zombie.png`
      }
      if (originalType === 'husk') {
        texturePath = huskPng
      }
      if (originalType === 'skeleton_horse') {
        texturePath = `textures/${version}/entity/horse/horse_skeleton.png`
      }
      if (originalType === 'donkey') {
        texturePath = `textures/${version}/entity/horse/donkey.png`
      }
      if (originalType === 'mule') {
        texturePath = `textures/${version}/entity/horse/mule.png`
      }
      if (originalType === 'ocelot') {
        texturePath = `textures/${version}/entity/cat/ocelot.png`
      }
      if (!texturePath) throw new Error(`No texture for ${type}`)
      const texture = new THREE.TextureLoader().load(texturePath)
      texture.minFilter = THREE.NearestFilter
      texture.magFilter = THREE.NearestFilter
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1
      })
      const obj = objLoader.parse(externalModels[type])
      const scale = scaleEntity[originalType]
      if (scale) obj.scale.set(scale, scale, scale)
      const offset = offsetEntity[originalType]
      if (offset) obj.position.set(offset.x, offset.y, offset.z)
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = material
          // todo
          if (child.name === 'Head layer') child.visible = false
          if (child.name === 'Head' && overrides.rotation?.head) { // todo
            child.rotation.x -= (overrides.rotation.head.x ?? 0) * Math.PI / 180
            child.rotation.y -= (overrides.rotation.head.y ?? 0) * Math.PI / 180
            child.rotation.z -= (overrides.rotation.head.z ?? 0) * Math.PI / 180
          }
        }
      })
      this.mesh = obj
      return
    }

    const e = getEntity(type)
    if (!e) {
      if (knownNotHandled.includes(type)) return
      throw new Error(`Unknown entity ${type}`)
    }

    this.mesh = new THREE.Object3D()
    for (const [name, jsonModel] of Object.entries(e.geometry)) {
      const texture = overrides.textures?.[name] ?? e.textures[name]
      if (!texture) continue
      // console.log(JSON.stringify(jsonModel, null, 2))
      const mesh = getMesh(worldRenderer, texture, jsonModel, overrides)
      mesh.name = `geometry_${name}`
      this.mesh.add(mesh)

      const skeletonHelper = new THREE.SkeletonHelper(mesh)
      //@ts-expect-error
      skeletonHelper.material.linewidth = 2
      skeletonHelper.visible = false
      this.mesh.add(skeletonHelper)
    }
  }

  static getStaticData(name) {
    name = temporaryMap[name] || name
    if (externalModels[name]) {
      return {
        boneNames: [] // todo
      }
    }
    const e = getEntity(name)
    if (!e) throw new Error(`Unknown entity ${name}`)
    return {
      boneNames: Object.values(e.geometry).flatMap(x => x.name)
    }
  }
}
