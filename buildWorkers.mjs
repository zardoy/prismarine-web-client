//@ts-check
// main worker file intended for computing world geometry is built using prismarine-viewer/buildWorker.mjs
import { build, context } from 'esbuild'
import fs from 'fs'
import path, { join } from 'path'
import { polyfillNode } from 'esbuild-plugin-polyfill-node'
import { mesherSharedPlugins } from './scripts/esbuildPlugins.mjs'
import { fileURLToPath } from 'url'
import { dynamicMcDataFiles } from './src/integratedServer/workerMcData.mjs'

const watch = process.argv.includes('-w')

const sharedAliases = {
  'three': './node_modules/three/src/Three.js',
  events: 'events', // make explicit
  buffer: 'buffer',
  'fs': './src/shims/fs.js',
  http: './src/shims/empty.ts',
  perf_hooks: './src/shims/perf_hooks_replacement.js',
  crypto: './src/shims/crypto.js',
  stream: 'stream-browserify',
  net: './src/shims/empty.ts',
  assert: 'assert',
  dns: './src/shims/empty.ts',
  '@azure/msal-node': './src/shims/empty.ts',
}

const result = await (watch ? context : build)({
  bundle: true,
  platform: 'browser',
  // entryPoints: ['prismarine-viewer/examples/webgpuRendererWorker.ts', 'src/worldSaveWorker.ts'],
  entryPoints: ['prismarine-viewer/examples/webgpuRendererWorker.ts'],
  outdir: 'prismarine-viewer/dist/',
  sourcemap: watch ? 'inline' : 'external',
  minify: !watch,
  treeShaking: true,
  logLevel: 'info',
  alias: sharedAliases,
  plugins: [
    {
      name: 'writeOutput',
      setup (build) {
        build.onEnd(({ outputFiles }) => {
          fs.mkdirSync('prismarine-viewer/public', { recursive: true })
          fs.mkdirSync('dist', { recursive: true })
          for (const file of outputFiles) {
            for (const dir of ['prismarine-viewer/dist', 'dist']) {
              const baseName = path.basename(file.path)
              fs.mkdirSync(dir, { recursive: true })
              fs.writeFileSync(path.join(dir, baseName), file.contents)
            }
          }
        })
      }
    },
    {
      name: 'fix-dynamic-require',
      setup (build) {
        build.onResolve({
          filter: /1\.14\/chunk/,
        }, async ({ resolveDir, path }) => {
          if (!resolveDir.includes('prismarine-provider-anvil')) return
          return {
            namespace: 'fix-dynamic-require',
            path,
            pluginData: {
              resolvedPath: `${join(resolveDir, path)}.js`,
              resolveDir
            },
          }
        })
        build.onLoad({
          filter: /.+/,
          namespace: 'fix-dynamic-require',
        }, async ({ pluginData: { resolvedPath, resolveDir } }) => {
          const resolvedFile = await fs.promises.readFile(resolvedPath, 'utf8')
          return {
            contents: resolvedFile.replace("require(`prismarine-chunk/src/pc/common/BitArray${noSpan ? 'NoSpan' : ''}`)", "noSpan ? require(`prismarine-chunk/src/pc/common/BitArray`) : require(`prismarine-chunk/src/pc/common/BitArrayNoSpan`)"),
            resolveDir,
            loader: 'js',
          }
        })
      }
    },
    polyfillNode({
      polyfills: {
        fs: false,
        dns: false,
        crypto: false,
        events: false,
        http: false,
        stream: false,
        buffer: false,
        perf_hooks: false,
        net: false,
        assert: false,
      },
    })
  ],
  loader: {
    '.vert': 'text',
    '.frag': 'text',
    '.wgsl': 'text',
  },
  mainFields: [
    'browser', 'module', 'main'
  ],
  keepNames: true,
  write: false,
})

if (watch) {
  //@ts-ignore
  await result.watch()
}

const allowedBundleFiles = ['legacy', 'versions', 'protocolVersions', 'features']

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)))


/** @type {import('esbuild').BuildOptions} */
const integratedServerBuildOptions = {
  bundle: true,
  banner: {
    js: `globalThis.global = globalThis;process = {env: {}, versions: {} };`,
  },
  platform: 'browser',
  entryPoints: [path.join(__dirname, './src/integratedServer/worker.ts')],
  minify: !watch,
  logLevel: 'info',
  drop: !watch ? [
    'debugger'
  ] : [],
  sourcemap: 'linked',
  // write: false,
  // metafile: true,
  // outdir: path.join(__dirname, './dist'),
  outfile: './dist/integratedServer.js',
  define: {
    'process.env.BROWSER': '"true"',
    'process.versions.node': '"50.0.0"',
  },
  alias: sharedAliases,
  plugins: [
    ...mesherSharedPlugins,
    {
      name: 'custom-plugins',
      setup (build) {
        build.onResolve({ filter: /\.json$/ }, args => {
          const fileName = args.path.split('/').pop().replace('.json', '')
          if (args.resolveDir.includes('minecraft-data')) {
            if (args.path.replaceAll('\\', '/').endsWith('bedrock/common/protocolVersions.json')) {
              return
            }
            if (args.path.includes('bedrock')) {
              return { path: args.path, namespace: 'empty-file', }
            }
            if (dynamicMcDataFiles.includes(fileName)) {
              return {
                path: args.path,
                namespace: 'mc-data',
              }
            }
            if (!allowedBundleFiles.includes(fileName)) {
              return { path: args.path, namespace: 'empty-file', }
            }
          }
        })
        build.onResolve({
          filter: /external/,
        }, ({ path, importer }) => {
          importer = importer.split('\\').join('/')
          if (importer.endsWith('flying-squid/dist/lib/modules/index.js')) {
            return {
              path,
              namespace: 'empty-file-object',
            }
          }
        })
        build.onLoad({
          filter: /.*/,
          namespace: 'empty-file',
        }, () => {
          return { contents: 'module.exports = undefined', loader: 'js' }
        })
        build.onLoad({
          filter: /.*/,
          namespace: 'empty-file-object',
        }, () => {
          return { contents: 'module.exports = {}', loader: 'js' }
        })
        build.onLoad({
          namespace: 'mc-data',
          filter: /.*/,
        }, async ({ path }) => {
          const fileName = path.split(/[\\\/]/).pop().replace('.json', '')
          return {
            contents: `module.exports = globalThis.mcData["${fileName}"]`,
            loader: 'js',
            resolveDir: process.cwd(),
          }
        })
        build.onResolve({
          filter: /^esbuild-data$/,
        }, () => {
          return {
            path: 'esbuild-data',
            namespace: 'esbuild-data',
          }
        })
        build.onLoad({
          filter: /.*/,
          namespace: 'esbuild-data',
        }, () => {
          const data = {
            // todo always use latest
            tints: 'require("minecraft-data/minecraft-data/data/pc/1.16.2/tints.json")'
          }
          return {
            contents: `module.exports = {${Object.entries(data).map(([key, code]) => `${key}: ${code}`).join(', ')}}`,
            loader: 'js',
            resolveDir: process.cwd(),
          }
        })

        build.onResolve({
          filter: /minecraft-protocol$/,
        }, async (args) => {
          return {
            ...await build.resolve('minecraft-protocol/src/index.js', { kind: args.kind, importer: args.importer, resolveDir: args.resolveDir }),
          }
        })

        // build.onEnd(({ metafile, outputFiles }) => {
        //   if (!metafile) return
        //   fs.mkdirSync(path.join(__dirname, './dist'), { recursive: true })
        //   fs.writeFileSync(path.join(__dirname, './dist/metafile.json'), JSON.stringify(metafile))
        //   for (const outDir of ['../dist/', './dist/']) {
        //     for (const outputFile of outputFiles) {
        //       if (outDir === '../dist/' && outputFile.path.endsWith('.map')) {
        //         // skip writing & browser loading sourcemap there, worker debugging should be done in playground
        //         // continue
        //       }
        //       const writePath = path.join(__dirname, outDir, path.basename(outputFile.path))
        //       fs.mkdirSync(path.dirname(writePath), { recursive: true })
        //       fs.writeFileSync(writePath, outputFile.text)
        //     }
        //   }
        // })
      }
    },
    polyfillNode({
      polyfills: {
        fs: false,
        dns: false,
        crypto: false,
        events: false,
        http: false,
        stream: false,
        buffer: false,
        perf_hooks: false,
        net: false,
        assert: false,
      },
    }),
  ],
}

if (watch) {
  const ctx = await context(integratedServerBuildOptions)
  await ctx.watch()
} else {
  await build(integratedServerBuildOptions)
}
