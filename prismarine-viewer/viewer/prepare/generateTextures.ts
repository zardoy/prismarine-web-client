import path from 'path'
import { makeBlockTextureAtlas } from './atlas'
import { McAssets, prepareBlocksStates } from './modelsBuilder'
import mcAssets from 'minecraft-assets'
import fs from 'fs-extra'
import { prepareMoreGeneratedBlocks } from './moreGeneratedBlocks'
import { generateItemsAtlases } from './genItemsAtlas'

const publicPath = path.resolve(__dirname, '../../public')

const texturesPath = path.join(publicPath, 'textures')
if (fs.existsSync(texturesPath) && !process.argv.includes('-f')) {
  console.log('textures folder already exists, skipping...')
  process.exit(0)
}
fs.mkdirSync(texturesPath, { recursive: true })

const blockStatesPath = path.join(publicPath, 'blocksStates')
fs.mkdirSync(blockStatesPath, { recursive: true })

const warnings = new Set<string>()
Promise.resolve().then(async () => {
  generateItemsAtlases()
  console.time('generateTextures')
  for (const version of mcAssets.versions as typeof mcAssets['versions']) {
    // for debugging (e.g. when above is overridden)
    if (!mcAssets.versions.includes(version)) {
      throw new Error(`Version ${version} is not supported by minecraft-assets`)
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

  fs.writeFileSync(path.join(publicPath, 'supportedVersions.json'), '[' + mcAssets.versions.map(v => `"${v}"`).toString() + ']')
  warnings.forEach(x => console.warn(x))
  console.timeEnd('generateTextures')
})
