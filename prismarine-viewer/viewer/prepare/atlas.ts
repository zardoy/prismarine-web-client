import fs from 'fs'
import path from 'path'
import { Canvas, Image } from 'canvas'
import { getAdditionalTextures } from './moreGeneratedBlocks'

function nextPowerOfTwo (n) {
  if (n === 0) return 1
  n--
  n |= n >> 1
  n |= n >> 2
  n |= n >> 4
  n |= n >> 8
  n |= n >> 16
  return n + 1
}

const localTextures = ['missing_texture.png']

function readTexture (basePath, name) {
  if (localTextures.includes(name)) {
    // grab ./missing_texture.png
    basePath = __dirname
  }
  return fs.readFileSync(path.join(basePath, name), 'base64')
}

export function makeTextureAtlas (mcAssets) {
  const blocksTexturePath = path.join(mcAssets.directory, '/blocks')
  const textureFiles = fs.readdirSync(blocksTexturePath).filter(file => file.endsWith('.png'))
  textureFiles.unshift(...localTextures)

  const { generated: additionalTextures, twoBlockTextures } = getAdditionalTextures()
  textureFiles.push(...Object.keys(additionalTextures))

  const texSize = nextPowerOfTwo(Math.ceil(Math.sqrt(textureFiles.length + twoBlockTextures.length)))
  const tileSize = 16

  const imgSize = texSize * tileSize
  const canvas = new Canvas(imgSize, imgSize, 'png' as any)
  const g = canvas.getContext('2d')

  const texturesIndex = {}

  let offset = 0
  for (const i in textureFiles) {
    const pos = +i + offset
    const x = (pos % texSize) * tileSize
    const y = Math.floor(pos / texSize) * tileSize

    const name = textureFiles[i].split('.')[0]

    const img = new Image()
    if (additionalTextures[name]) {
      img.src = additionalTextures[name]
    } else {
      img.src = 'data:image/png;base64,' + readTexture(blocksTexturePath, textureFiles[i])
    }
    const twoTileWidth = twoBlockTextures.includes(name)
    if (twoTileWidth) {
      offset++
    }
    const renderWidth = twoTileWidth ? tileSize * 2 : tileSize
    g.drawImage(img, 0, 0, renderWidth, tileSize, x, y, renderWidth, tileSize)

    texturesIndex[name] = { u: x / imgSize, v: y / imgSize, su: tileSize / imgSize, sv: tileSize / imgSize }
  }

  return { image: canvas.toBuffer(), canvas, json: { size: tileSize / imgSize, textures: texturesIndex } }
}
