// main worker file intended for computing world geometry is built using prismarine-viewer/buildWorker.mjs
import { build, context } from 'esbuild'

const watch = process.argv.includes('-w')

const result = await (watch ? context : build)({
    bundle: true,
    platform: 'browser',
    entryPoints: ['prismarine-viewer/examples/webglRendererWorker.ts'],
    outfile: 'prismarine-viewer/public/webglRendererWorker.js',
    sourcemap: 'inline',
    // minify: true,
    logLevel: 'info',
    plugins: [],
    loader: {
        '.vert': 'text',
        '.frag': 'text'
    },
    mainFields: [
        'browser', 'module', 'main'
    ],
    keepNames: true,
})

if (watch) {
    await result.watch()
}
