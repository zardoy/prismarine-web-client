import path from 'path'
import fs from 'fs'

const publicPath = path.resolve(__dirname, '../../public')
const texturesPath = path.join(publicPath, 'textures')

if (fs.existsSync(texturesPath) && !process.argv.includes('-f')) {
    console.log('textures folder already exists, skipping...')
    process.exit(0)
} else {
    import('./generateTextures')
}
