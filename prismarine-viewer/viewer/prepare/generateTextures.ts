import path from 'path'
import { makeTextureAtlas } from './atlas'
import { McAssets, prepareBlocksStates } from './modelsBuilder'
import mcAssets from 'minecraft-assets'
import fs from 'fs-extra'

const publicPath = path.resolve(__dirname, '../../public')

const texturesPath = path.join(publicPath, 'textures')
if (fs.existsSync(texturesPath) && !process.argv.includes('-f')) {
  console.log('textures folder already exists, skipping...')
  process.exit(0)
}
fs.mkdirSync(texturesPath, { recursive: true })

const blockStatesPath = path.join(publicPath, 'blocksStates')
fs.mkdirSync(blockStatesPath, { recursive: true })

Promise.resolve().then(async () => {
  for (const version of mcAssets.versions) {
    const assets = mcAssets(version)
    // #region texture atlas
    const atlas = makeTextureAtlas(assets)
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
})
