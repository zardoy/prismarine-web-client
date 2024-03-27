// main worker file intended for computing world geometry is built using prismarine-viewer/buildWorker.mjs
import { build, context } from 'esbuild'
import fs from 'fs'

const watch = process.argv.includes('-w')

const result = await (watch ? context : build)({
    bundle: true,
    platform: 'browser',
    entryPoints: ['prismarine-viewer/examples/webglRendererWorker.ts', 'src/worldSaveWorker.ts'],
    outdir: 'prismarine-viewer/public/',
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
    inject: [
        './src/shims.js'
    ],
    plugins: [
        {
            name: 'writeOutput',
            setup (build) {
                build.onEnd(({ outputFiles }) => {
                    for (const file of outputFiles) {
                        for (const dir of ['prismarine-viewer/public', 'dist']) {
                            const baseName = file.path.split('/').pop()
                            fs.writeFileSync(`${dir}/${baseName}`, file.contents)
                        }
                    }
                })
            }
        }
    ],
    loader: {
        '.vert': 'text',
        '.frag': 'text'
    },
    mainFields: [
        'browser', 'module', 'main'
    ],
    keepNames: true,
    write: false,
})

if (watch) {
    await result.watch()
}
