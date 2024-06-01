import path from 'path'
import { makeBlockTextureAtlas } from './atlas'
import { prepareBlocksStates } from './modelsBuilder'
import mcAssets from 'minecraft-assets'
import fs from 'fs-extra'
import { prepareMoreGeneratedBlocks } from './moreGeneratedBlocks'
import { generateItemsAtlases } from './genItemsAtlas'
import { versionToNumber } from './utils'

const publicPath = path.resolve(__dirname, '../../public')

const texturesPath = path.join(publicPath, 'textures')
fs.mkdirSync(texturesPath, { recursive: true })

const blockStatesPath = path.join(publicPath, 'blocksStates')
fs.mkdirSync(blockStatesPath, { recursive: true })

const warnings = new Set<string>()
Promise.resolve().then(async () => {
  generateItemsAtlases()
  console.time('generateTextures')
  const versions = process.argv.includes('-l') ? [mcAssets.versions.at(-1)!] : mcAssets.versions
  for (const version of versions as typeof mcAssets['versions']) {
    // for debugging (e.g. when above is overridden)
    if (!versions.includes(version)) {
      throw new Error(`Version ${version} is not supported by minecraft-assets`)
    }
    if (versionToNumber(version) < versionToNumber('1.13')) {
      // we normalize data to 1.13 for pre 1.13 versions
      continue
    }
    const assets = mcAssets(version)
    const { warnings: _warnings } = await prepareMoreGeneratedBlocks(assets)
    _warnings.forEach(x => warnings.add(x))
    // #region texture atlas
    const atlas = makeBlockTextureAtlas(assets)
    const out = fs.createWriteStream(path.resolve(texturesPath, version + '.png'))
    const stream = (atlas.canvas as any).pngStream()
    stream.on('data', (chunk) => out.write(chunk))
    stream.on('end', () => console.log('Generated textures/' + version + '.png'))
    // #endregion

    const blocksStates = JSON.stringify(prepareBlocksStates(assets, atlas))
    fs.writeFileSync(path.resolve(blockStatesPath, version + '.json'), blocksStates)

    fs.copySync(assets.directory, path.resolve(texturesPath, version), { overwrite: true })
  }

  fs.writeFileSync(path.join(publicPath, 'supportedVersions.json'), '[' + versions.map(v => `"${v}"`).toString() + ']')
  warnings.forEach(x => console.warn(x))
  console.timeEnd('generateTextures')
})
