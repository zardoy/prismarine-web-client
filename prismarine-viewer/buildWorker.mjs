import { context } from 'esbuild'
import { build } from 'esbuild'
import { polyfillNode } from 'esbuild-plugin-polyfill-node'
import path from 'path'
import { fileURLToPath } from 'url'

const allowedWorkerFiles = ['blocks', 'blockCollisionShapes', 'tints', 'blockStates',
  'biomes', 'features', 'version', 'legacy', 'versions', 'version', 'protocolVersions']

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)))

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  bundle: true,
  banner: {
    js: 'globalThis.global = globalThis;process = {env: {}, versions: {}, };',
  },
  platform: 'browser',
  entryPoints: [path.join(__dirname, './viewer/lib/worker.js')],
  outfile: path.join(__dirname, './public/worker.js'),
  minify: true,
  logLevel: 'info',
  drop: [
    'debugger'
  ],
  sourcemap: true,
  plugins: [
    {
      name: 'external-json',
      setup (build) {
        build.onResolve({ filter: /\.json$/ }, args => {
          const fileName = args.path.split('/').pop().replace('.json', '')
          if (args.resolveDir.includes('minecraft-data')) {
            if (args.path.replaceAll('\\', '/').endsWith('bedrock/common/protocolVersions.json')) {
              return
            }
            if (!allowedWorkerFiles.includes(fileName) || args.path.includes('bedrock')) {
              return { path: args.path, namespace: 'empty-file', }
            }
          }
        })
        build.onResolve({
          filter: /^zlib$/,
        }, ({ path }) => {
          return {
            path,
            namespace: 'empty-file',
          }
        })
        build.onLoad({
          filter: /.*/,
          namespace: 'empty-file',
        }, () => {
          return { contents: 'module.exports = undefined', loader: 'js' }
        })
      }
    },
    polyfillNode(),
  ],
}

if (process.argv.includes('-w')) {
  const ctx = await context(buildOptions)
  await ctx.watch()
} else {
  await build(buildOptions)
}
