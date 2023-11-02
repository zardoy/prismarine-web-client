import * as fs from 'fs'
import fsExtra from 'fs-extra'

//@ts-check
import * as esbuild from 'esbuild'
import { polyfillNode } from 'esbuild-plugin-polyfill-node'
import path, { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const dev = process.argv.includes('-w')

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)))

const mcDataPath = join(__dirname, '../dist/mc-data')
if (!fs.existsSync(mcDataPath)) {
  // shouldn't it be in the viewer instead?
  await import('../scripts/prepareData.mjs')
}

fs.mkdirSync(join(__dirname, 'public'), { recursive: true })
fs.copyFileSync(join(__dirname, 'playground.html'), join(__dirname, 'public/index.html'))
fsExtra.copySync(mcDataPath, join(__dirname, 'public/mc-data'))
const availableVersions = fs.readdirSync(mcDataPath).map(ver => ver.replace('.js', ''))

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  bundle: true,
  entryPoints: [join(__dirname, './examples/playground.ts')],
  // target: ['es2020'],
  // logLevel: 'debug',
  logLevel: 'info',
  platform: 'browser',
  sourcemap: dev ? 'inline' : false,
  minify: !dev,
  outfile: join(__dirname, 'public/playground.js'),
  mainFields: [
    'browser', 'module', 'main'
  ],
  keepNames: true,
  banner: {
    js: `globalThis.global = globalThis;globalThis.includedVersions = ${JSON.stringify(availableVersions)};`,
  },
  alias: {
    events: 'events',
    buffer: 'buffer',
    'fs': 'browserfs/dist/shims/fs.js',
    http: 'http-browserify',
    stream: 'stream-browserify',
    net: 'net-browserify',
  },
  inject: [],
  metafile: true,
  plugins: [
    {
      name: 'minecraft-data',
      setup (build) {
        build.onLoad({
          filter: /minecraft-data[\/\\]data.js$/,
        }, () => {
          const defaultVersionsObj = {}
          return {
            contents: `window.mcData ??= ${JSON.stringify(defaultVersionsObj)};module.exports = { pc: window.mcData }`,
            loader: 'js',
          }
        })
        build.onEnd((e) => {
          if (e.errors.length) return
          fs.writeFileSync(join(__dirname, 'public/metafile.json'), JSON.stringify(e.metafile), 'utf8')
        })
      }
    },
    polyfillNode({
      polyfills: {
        fs: false,
        crypto: false,
        events: false,
        http: false,
        stream: false,
        buffer: false,
        perf_hooks: false,
        net: false,
      },
    })
  ],
}
if (dev) {
  (await esbuild.context(buildOptions)).watch()
} else {
  await esbuild.build(buildOptions)
}

// await ctx.rebuild()
