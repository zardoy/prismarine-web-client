type ModelBasic = {
  model: string
  x?: number
  y?: number
  uvlock?: boolean
}

type BlockApplyModel = ModelBasic | (ModelBasic & { weight })[]

type BlockStateCondition = {
  [name: string]: string | number
}

type BlockState = {
  variants?: {
    [name: string | ""]: BlockApplyModel
  }
  multipart?: {
    when: {
      [name: string]: string | number
    } & {
      OR?: BlockStateCondition[]
    }
    apply: BlockApplyModel
  }[]
}

type BlockModel = {
  parent?: string
  textures?: {
    [name: string]: string
  }
  elements?: {
    from: number[]
    to: number[]
    faces: {
      [name: string]: {
        texture: string
        uv?: number[]
        cullface?: string
      }
    }
  }[]
  ambientocclusion?: boolean
  x?: number
  y?: number
  z?: number
  ao?: boolean
}

export type McAssets = {
  blocksStates: {
    [x: string]: BlockState
  }
  blocksModels: {
    [x: string]: BlockModel
  }
  directory: string
  version: string
}

export type BlockStatesOutput = {
  // states: {
  [blockName: string]: any/* ResolvedModel */
  // }
  // defaults: {
  //   su: number
  //   sv: number
  // }
}

export type ResolvedModel = {
  textures: {
    [name: string]: {
      u: number
      v: number
      su: number
      sv: number
      bu: number
      bv: number
    }
  }
  elements: {
    from: number[]
    to: number[]
    faces: {
      [name: string]: {
        texture: {
          u: number
          v: number
          su: number
          sv: number
          bu: number
          bv: number
        }
      }
    }
  }[]
  ao: boolean
  x?: number
  y?: number
  z?: number
}

export const addBlockAllModel = (mcAssets: McAssets, name: string, texture = name) => {
  mcAssets.blocksStates[name] = {
    "variants": {
      "": {
        "model": name
      }
    }
  }
  mcAssets.blocksModels[name] = {
    "parent": "block/cube_all",
    "textures": {
      "all": `blocks/${texture}`
    }
  }
}

function cleanupBlockName (name: string) {
  if (name.startsWith('block') || name.startsWith('minecraft:block')) return name.split('/')[1]
  return name
}

const objectAssignStrict = <T extends Record<string, any>> (target: T, source: Partial<T>) => Object.assign(target, source)

function getFinalModel (name: string, blocksModels: { [x: string]: BlockModel }) {
  name = cleanupBlockName(name)
  const input = blocksModels[name]
  if (!input) {
    return null
  }

  let out: BlockModel | null = {
    textures: {},
    elements: [],
    ao: true,
    x: input.x,
    y: input.y,
    z: input.z,
  }

  if (input.parent) {
    out = getFinalModel(input.parent, blocksModels)
    if (!out) return null
  }
  if (input.textures) {
    Object.assign(out.textures!, deepCopy(input.textures))
  }
  if (input.elements) out.elements = deepCopy(input.elements)
  if (input.ao !== undefined) out.ao = input.ao
  return out
}

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj))

const workerUsedTextures = ['particle']
function prepareModel (model: BlockModel, texturesJson) {
  const newModel = {}

  const getFinalTexture = (originalBlockName) => {
    // texture name e.g. blocks/anvil_base
    const cleanBlockName = cleanupBlockName(originalBlockName);
    return { ...texturesJson[cleanBlockName], /* __debugName: cleanBlockName */ }
  }

  const finalTextures = []

  // resolve texture names eg west: #all -> blocks/stone
  for (const side in model.textures) {
    let texture = model.textures[side]

    while (texture.charAt(0) === '#') {
      const textureName = texture.slice(1)
      texture = model.textures[textureName]
      if (texture === undefined) throw new Error(`Texture ${textureName} in ${JSON.stringify(model.textures)} not found`)
    }

    finalTextures[side] = getFinalTexture(texture)
    if (workerUsedTextures.includes(side)) {
      model.textures[side] = finalTextures[side]
    }
  }

  for (const elem of model.elements!) {
    for (const sideName of Object.keys(elem.faces)) {
      const face = elem.faces[sideName]

      const finalTexture = deepCopy(
        face.texture.charAt(0) === '#'
          ? finalTextures![face.texture.slice(1)]
          : getFinalTexture(face.texture)
      )

      const _from = elem.from
      const _to = elem.to
      // taken from https://github.com/DragonDev1906/Minecraft-Overviewer/
      const uv = face.uv || {
        // default UVs
        // format: [u1, v1, u2, v2] (u = x, v = y)
        north: [_to[0], 16 - _to[1], _from[0], 16 - _from[1]],
        east: [_from[2], 16 - _to[1], _to[2], 16 - _from[1]],
        south: [_from[0], 16 - _to[1], _to[0], 16 - _from[1]],
        west: [_from[2], 16 - _to[1], _to[2], 16 - _from[1]],
        up: [_from[0], _from[2], _to[0], _to[2]],
        down: [_to[0], _from[2], _from[0], _to[2]]
      }[sideName]!

      const su = (uv[2] - uv[0]) / 16 * finalTexture.su
      const sv = (uv[3] - uv[1]) / 16 * finalTexture.sv
      finalTexture.u += uv[0] / 16 * finalTexture.su
      finalTexture.v += uv[1] / 16 * finalTexture.sv
      finalTexture.su = su
      finalTexture.sv = sv
      face.texture = finalTexture
    }
  }
  return model
}

function resolveModel (name, blocksModels, texturesJson) {
  const model = getFinalModel(name, blocksModels)
  return prepareModel(model, texturesJson.textures)
}

export function prepareBlocksStates (mcAssets: McAssets, atlas: { json: any }) {
  addBlockAllModel(mcAssets, 'missing_texture')

  const blocksStates = mcAssets.blocksStates
  for (const block of Object.values(blocksStates)) {
    if (!block) continue
    if (block.variants) {
      for (const variant of Object.values(block.variants)) {
        if (variant instanceof Array) {
          for (const v of variant) {
            v.model = resolveModel(v.model, mcAssets.blocksModels, atlas.json) as any
          }
        } else {
          variant.model = resolveModel(variant.model, mcAssets.blocksModels, atlas.json) as any
        }
      }
    }
    if (block.multipart) {
      for (const variant of block.multipart) {
        if (variant.apply instanceof Array) {
          for (const v of variant.apply) {
            v.model = resolveModel(v.model, mcAssets.blocksModels, atlas.json) as any
          }
        } else {
          variant.apply.model = resolveModel(variant.apply.model, mcAssets.blocksModels, atlas.json) as any
        }
      }
    }
  }
  return blocksStates
}
