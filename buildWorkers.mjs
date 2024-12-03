//@ts-check
// main worker file intended for computing world geometry is built using prismarine-viewer/buildWorker.mjs
import { build, context } from 'esbuild'
import fs from 'fs'
import path, { join } from 'path'
import { polyfillNode } from 'esbuild-plugin-polyfill-node'

const watch = process.argv.includes('-w')

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
    alias: {
        'three': './node_modules/three/src/Three.js',
        events: 'events', // make explicit
        buffer: 'buffer',
        'fs': 'browserfs/dist/shims/fs.js',
        http: 'http-browserify',
        perf_hooks: './src/perf_hooks_replacement.js',
        crypto: './src/crypto.js',
        stream: 'stream-browserify',
        net: 'net-browserify',
        assert: 'assert',
        dns: './src/dns.js'
    },
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
