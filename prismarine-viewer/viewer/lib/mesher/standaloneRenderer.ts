/* eslint-disable @stylistic/function-call-argument-newline */
import { Vec3 } from 'vec3'
import { Block } from 'prismarine-block'
import { IndexedData } from 'minecraft-data'
import * as THREE from 'three'
import { BlockModelPartsResolved } from './world'
import { BlockElement, buildRotationMatrix, elemFaces, matmul3, matmulmat3, vecadd3, vecsub3 } from './modelsGeometryCommon'

type NeighborSide = 'up' | 'down' | 'east' | 'west' | 'north' | 'south'

function tintToGl (tint) {
  const r = (tint >> 16) & 0xff
  const g = (tint >> 8) & 0xff
  const b = tint & 0xff
  return [r / 255, g / 255, b / 255]
}

type Neighbors = Partial<Record<NeighborSide, boolean>>
function renderElement (element: BlockElement, doAO: boolean, attr, globalMatrix, globalShift, block: Block | undefined, biome: string, neighbors: Neighbors) {
  const cursor = new Vec3(0, 0, 0)

  // const key = `${position.x},${position.y},${position.z}`
  // if (!globalThis.allowedBlocks.includes(key)) return
  // const cullIfIdentical = block.name.indexOf('glass') >= 0

  // eslint-disable-next-line guard-for-in
  for (const face in element.faces) {
    const eFace = element.faces[face]
    const { corners, mask1, mask2 } = elemFaces[face]
    const dir = matmul3(globalMatrix, elemFaces[face].dir)

    if (eFace.cullface) {
      if (neighbors[face]) continue
    }

    const minx = element.from[0]
    const miny = element.from[1]
    const minz = element.from[2]
    const maxx = element.to[0]
    const maxy = element.to[1]
    const maxz = element.to[2]

    const texture = eFace.texture as any
    const { u } = texture
    const { v } = texture
    const { su } = texture
    const { sv } = texture

    const ndx = Math.floor(attr.positions.length / 3)

    const tint = [1, 1, 1]
    if (eFace.tintindex !== undefined) {
      if (eFace.tintindex === 0) {
        // TODO
        // if (block.name === 'redstone_wire') {
        //   tint = tints.redstone[`${block.getProperties().power}`]
        // } else if (block.name === 'birch_leaves' ||
        //   block.name === 'spruce_leaves' ||
        //   block.name === 'lily_pad') {
        //   tint = tints.constant[block.name]
        // } else if (block.name.includes('leaves') || block.name === 'vine') {
        //   tint = tints.foliage[biome]
        // } else {
        //   tint = tints.grass[biome]
        // }
      }
    }

    // UV rotation
    const r = eFace.rotation || 0
    const uvcs = Math.cos(r * Math.PI / 180)
    const uvsn = -Math.sin(r * Math.PI / 180)

    let localMatrix = null as any
    let localShift = null as any

    if (element.rotation) {
      // todo do we support rescale?
      localMatrix = buildRotationMatrix(
        element.rotation.axis,
        element.rotation.angle
      )

      localShift = vecsub3(
        element.rotation.origin,
        matmul3(
          localMatrix,
          element.rotation.origin
        )
      )
    }

    const aos: number[] = []
    // const neighborPos = position.plus(new Vec3(...dir))
    // const baseLight = world.getLight(neighborPos, undefined, undefined, block.name) / 15
    const baseLight = 1
    for (const pos of corners) {
      let vertex = [
        (pos[0] ? maxx : minx),
        (pos[1] ? maxy : miny),
        (pos[2] ? maxz : minz)
      ]

      vertex = vecadd3(matmul3(localMatrix, vertex), localShift)
      vertex = vecadd3(matmul3(globalMatrix, vertex), globalShift)
      vertex = vertex.map(v => v / 16)

      attr.positions.push(
        vertex[0]/*  + (cursor.x & 15) - 8 */,
        vertex[1]/*  + (cursor.y & 15) x */,
        vertex[2]/*  + (cursor.z & 15) - 8 */
      )

      attr.normals.push(...dir)

      const baseu = (pos[3] - 0.5) * uvcs - (pos[4] - 0.5) * uvsn + 0.5
      const basev = (pos[3] - 0.5) * uvsn + (pos[4] - 0.5) * uvcs + 0.5
      attr.uvs.push(baseu * su + u, basev * sv + v)

      let light = 1
      if (doAO) {
        const cornerLightResult = 15

        const side1Block = 0
        const side2Block = 0
        const cornerBlock = 0

        const ao = (side1Block && side2Block) ? 0 : (3 - (side1Block + side2Block + cornerBlock))
        // todo light should go upper on lower blocks
        light = (ao + 1) / 4 * (cornerLightResult / 15)
        aos.push(ao)
      }

      attr.colors.push(baseLight * tint[0] * light, baseLight * tint[1] * light, baseLight * tint[2] * light)
    }

    // if (needTiles) {
    //   attr.tiles[`${cursor.x},${cursor.y},${cursor.z}`] ??= {
    //     block: block.name,
    //     faces: [],
    //   }
    //   attr.tiles[`${cursor.x},${cursor.y},${cursor.z}`].faces.push({
    //     face,
    //     neighbor: `${neighborPos.x},${neighborPos.y},${neighborPos.z}`,
    //     light: baseLight
    //     // texture: eFace.texture.name,
    //   })
    // }

    if (doAO && aos[0] + aos[3] >= aos[1] + aos[2]) {
      attr.indices.push(

        ndx, ndx + 3, ndx + 2,
        ndx, ndx + 1, ndx + 3
      )
    } else {
      attr.indices.push(

        ndx, ndx + 1, ndx + 2,
        ndx + 2, ndx + 1, ndx + 3
      )
    }
  }
}

export const renderBlockThreeAttr = (models: BlockModelPartsResolved, block: Block | undefined, biome: string, mcData: IndexedData, variants = [], neighbors: Neighbors = {}) => {
  const sx = 0
  const sy = 0
  const sz = 0

  const attr = {
    sx: sx + 0.5,
    sy: sy + 0.5,
    sz: sz + 0.5,
    positions: [],
    normals: [],
    colors: [],
    uvs: [],
    t_positions: [],
    t_normals: [],
    t_colors: [],
    t_uvs: [],
    indices: [],
    tiles: {},
  } as Record<string, any>

  for (const [i, modelVars] of models.entries()) {
    const model = modelVars[variants[i]] ?? modelVars[0]
    if (!model) continue
    let globalMatrix = null as any
    let globalShift = null as any
    for (const axis of ['x', 'y', 'z'] as const) {
      if (axis in model) {
        if (globalMatrix) { globalMatrix = matmulmat3(globalMatrix, buildRotationMatrix(axis, -(model[axis] ?? 0))) } else { globalMatrix = buildRotationMatrix(axis, -(model[axis] ?? 0)) }
      }
    }
    if (globalMatrix) {
      globalShift = [8, 8, 8]
      globalShift = vecsub3(globalShift, matmul3(globalMatrix, globalShift))
    }

    const ao = model.ao ?? true

    for (const element of model.elements ?? []) {
      renderElement(element, ao, attr, globalMatrix, globalShift, block, biome, neighbors)
    }
  }

  let ndx = attr.positions.length / 3
  for (let i = 0; i < attr.t_positions.length / 12; i++) {
    attr.indices.push(
      ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3,
      // back face
      ndx, ndx + 2, ndx + 1, ndx + 2, ndx + 3, ndx + 1
    )
    ndx += 4
  }

  attr.positions.push(...attr.t_positions)
  attr.normals.push(...attr.t_normals)
  attr.colors.push(...attr.t_colors)
  attr.uvs.push(...attr.t_uvs)

  delete attr.t_positions
  delete attr.t_normals
  delete attr.t_colors
  delete attr.t_uvs

  attr.positions = new Float32Array(attr.positions) as any
  attr.normals = new Float32Array(attr.normals) as any
  attr.colors = new Float32Array(attr.colors) as any
  attr.uvs = new Float32Array(attr.uvs) as any

  return attr
}

export const renderBlockThree = (...args: Parameters<typeof renderBlockThreeAttr>) => {
  const attr = renderBlockThreeAttr(...args)
  const data = {
    geometry: attr
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(data.geometry.positions, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(data.geometry.normals, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(data.geometry.colors, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(data.geometry.uvs, 2))
  geometry.setIndex(data.geometry.indices)
  geometry.name = 'block-geometry'

  return geometry
}

export const getThreeBlockModelGroup = (material: THREE.Material, ...args: Parameters<typeof renderBlockThree>) => {
  const geometry = renderBlockThree(...args)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(-0.5, -0.5, -0.5)
  const group = new THREE.Group()
  group.add(mesh)
  group.rotation.set(0, -THREE.MathUtils.degToRad(90), 0, 'ZYX')
  globalThis.mesh = group
  return group
  // return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhongMaterial({ color: 0x00_00_ff, transparent: true, opacity: 0.5 }))
}

export const setBlockPosition = (object: THREE.Object3D, position: { x: number, y: number, z: number }) => {
  object.position.set(position.x + 0.5, position.y + 0.5, position.z + 0.5)
}
