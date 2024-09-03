export type BlockFaceType = {
  side: number
  textureIndex: number
  tint?: [number, number, number]
  isTransparent?: boolean

  // for testing
  face: string
  neighbor: string
  light?: number
}

export type BlockType = {
  faces: BlockFaceType[]

  // for testing
  block: string
}
