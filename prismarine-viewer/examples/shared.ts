export type BlockFaceType = {
    side: number
    textureIndex: number
    textureName?: string
    tint?: [number, number, number]
    isTransparent?: boolean
}

export type BlockType = {
    faces: BlockFaceType[]
}
