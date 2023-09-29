import * as fs from 'fs'

//@ts-check
import * as esbuild from 'esbuild'
import { polyfillNode } from 'esbuild-plugin-polyfill-node'
import path, { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const dev = !process.argv.includes('-p')

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)))

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  bundle: true,
  entryPoints: [join(__dirname, './examples/playground.js')],
  // target: ['es2020'],
  // logLevel: 'debug',
  logLevel: 'info',
  platform: 'browser',
  sourcemap: dev ? 'inline' : false,
  outfile: join(__dirname, 'public/index.js'),
  mainFields: [
    'browser', 'module', 'main'
  ],
  keepNames: true,
  banner: {
    js: 'globalThis.global = globalThis;',
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
      name: 'data-handler',
      setup (build) {
        const customMcDataNs = 'custom-mc'
        build.onResolve({
          filter: /.*/,
        }, ({ path, ...rest }) => {
          if (join(rest.resolveDir, path).replaceAll('\\', '/').endsWith('minecraft-data/data.js')) {
            return {
              path,
              namespace: customMcDataNs,
            }
          }
          return undefined
        })
        build.onLoad({
          filter: /.*/,
          namespace: customMcDataNs,
        }, async ({ path, ...rest }) => {
          const resolvedPath = await build.resolve('minecraft-data/minecraft-data/data/dataPaths.json', { kind: 'require-call', resolveDir: process.cwd() })
          const dataPaths = JSON.parse(await fs.promises.readFile(resolvedPath.path, 'utf8'))

          // bedrock unsupported
          delete dataPaths.bedrock

          const allowOnlyList = process.env.ONLY_MC_DATA?.split(',') ?? []

          const includeVersions = ['1.20.1', '1.18.1']

          const includedVersions = []
          let contents = `module.exports =\n{\n`
          for (const platform of Object.keys(dataPaths)) {
            contents += `  '${platform}': {\n`
            for (const version of Object.keys(dataPaths[platform])) {
              if (allowOnlyList.length && !allowOnlyList.includes(version)) continue
              if (!includeVersions.includes(version)) continue

              includedVersions.push(version)
              contents += `    '${version}': {\n`
              for (const dataType of Object.keys(dataPaths[platform][version])) {
                const loc = `minecraft-data/data/${dataPaths[platform][version][dataType]}/`
                contents += `      get ${dataType} () { return require("./${loc}${dataType}.json") },\n`
              }
              contents += '    },\n'
            }
            contents += '  },\n'
          }
          contents += `}\n;globalThis.includedVersions = ${JSON.stringify(includedVersions)};`

          return {
            contents,
            loader: 'js',
            resolveDir: join(dirname(resolvedPath.path), '../..'),
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
if (process.argv.includes('-w')) {
  (await esbuild.context(buildOptions)).watch()
} else {
  await esbuild.build(buildOptions)
}

// await ctx.rebuild()
