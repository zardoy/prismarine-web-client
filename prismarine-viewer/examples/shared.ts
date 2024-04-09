export type BlockFaceType = {
    face: number
    textureIndex: number
    textureName?: string
    tint?: [number, number, number]
    isTransparent?: boolean
}

export type BlockType = {
    sides: BlockFaceType[]
}
