//@ts-check
import * as fs from 'fs'
import fsExtra from 'fs-extra'

import * as esbuild from 'esbuild'
import { polyfillNode } from 'esbuild-plugin-polyfill-node'
import path, { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import childProcess from 'child_process'
import supportedVersions from '../src/supportedVersions.mjs'

const dev = process.argv.includes('-w')

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)))

const mcDataPath = join(__dirname, '../generated/minecraft-data-optimized.json')
if (!fs.existsSync(mcDataPath)) {
  childProcess.execSync('tsx ./scripts/makeOptimizedMcData.mjs', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
}

fs.copyFileSync(join(__dirname, 'playground.html'), join(__dirname, 'public/index.html'))

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
    js: `globalThis.global = globalThis;globalThis.includedVersions = ${JSON.stringify(supportedVersions)};`,
  },
  alias: {
    events: 'events',
    buffer: 'buffer',
    'fs': 'browserfs/dist/shims/fs.js',
    http: 'http-browserify',
    stream: 'stream-browserify',
    net: 'net-browserify',
    'stats.js': 'stats.js/src/Stats.js',
  },
  inject: [],
  metafile: true,
  loader: {
    '.png': 'dataurl',
    '.vert': 'text',
    '.frag': 'text',
    '.obj': 'text',
  },
  plugins: [
    {
      name: 'minecraft-data',
      setup (build) {
        build.onLoad({
          filter: /minecraft-data[\/\\]data.js$/,
        }, () => {
          const defaultVersionsObj = {}
          return {
            contents: fs.readFileSync(join(__dirname, '../src/shims/minecraftData.ts'), 'utf8'),
            loader: 'ts',
            resolveDir: join(__dirname, '../src/shims'),
          }
        })
        build.onEnd((e) => {
          if (e.errors.length) return
          fs.writeFileSync(join(__dirname, './public/metafile.json'), JSON.stringify(e.metafile), 'utf8')
        })
        build.onLoad({ filter: /.*.json$/ }, (args) => {
          // always minify json
          const contents = JSON.stringify(JSON.parse(fs.readFileSync(args.path, 'utf8')))
          return {
            contents,
            loader: 'json',
          }
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
