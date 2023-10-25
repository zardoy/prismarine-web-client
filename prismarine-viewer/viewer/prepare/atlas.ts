import fs from 'fs'
import path from 'path'
import { Canvas, Image } from 'canvas'
import { getAdditionalTextures } from './moreGeneratedBlocks'
import { McAssets } from './modelsBuilder'

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

export type JsonAtlas = {
  size: number,
  textures: {
    [file: string]: {
      u: number,
      v: number,
      su: number,
      sv: number
    }
  }
}

export const makeTextureAtlas = (input: string[], getInputData: (name) => {contents: string, tileWidthMult?: number}, tilesCount = input.length, suSvOptimize: 'remove' | null = null): {
  image: Buffer,
  canvas: Canvas,
  json: JsonAtlas
} => {
  const texSize = nextPowerOfTwo(Math.ceil(Math.sqrt(tilesCount)))
  const tileSize = 16

  const imgSize = texSize * tileSize
  const canvas = new Canvas(imgSize, imgSize, 'png' as any)
  const g = canvas.getContext('2d')

  const texturesIndex = {}

  let offset = 0
  const suSv = tileSize / imgSize
  for (const i in input) {
    const pos = +i + offset
    const x = (pos % texSize) * tileSize
    const y = Math.floor(pos / texSize) * tileSize

    const img = new Image()
    const keyValue = input[i];
    const inputData = getInputData(keyValue);
    img.src = inputData.contents
    const renderWidth = tileSize * (inputData.tileWidthMult ?? 1)
    g.drawImage(img, 0, 0, renderWidth, tileSize, x, y, renderWidth, tileSize)

    const cleanName = keyValue.split('.').slice(0, -1).join('.') || keyValue
    texturesIndex[cleanName] = {
      u: x / imgSize,
      v: y / imgSize,
      ...suSvOptimize === 'remove' ? {} : {
        su: suSv,
        sv: suSv
      }
    }
  }

  return { image: canvas.toBuffer(), canvas, json: { size: suSv, textures: texturesIndex } }
}

export const writeCanvasStream = (canvas, path, onEnd) => {
  const out = fs.createWriteStream(path)
  const stream = (canvas as any).pngStream()
  stream.on('data', (chunk) => out.write(chunk))
  if (onEnd) stream.on('end', onEnd)
  return stream
}

export function makeBlockTextureAtlas (mcAssets: McAssets) {
  const blocksTexturePath = path.join(mcAssets.directory, '/blocks')
  const textureFiles = fs.readdirSync(blocksTexturePath).filter(file => file.endsWith('.png'))
  // const textureFiles = mostEncounteredBlocks.map(x => x + '.png')
  textureFiles.unshift(...localTextures)

  const { generated: additionalTextures, twoTileTextures } = getAdditionalTextures()
  textureFiles.push(...Object.keys(additionalTextures))

  const atlas = makeTextureAtlas(textureFiles, name => {
    let contents: string
    if (additionalTextures[name]) {
      contents = additionalTextures[name]
    } else {
      contents = 'data:image/png;base64,' + readTexture(blocksTexturePath, name)
    }

    return {
      contents,
      tileWidthMult: twoTileTextures.includes(name) ? 2 : undefined,
    }
  })
  return atlas
}
