// main worker file intended for computing world geometry is built using prismarine-viewer/buildWorker.mjs
import { build, context } from 'esbuild'
import fs from 'fs'

const watch = process.argv.includes('-w')

const result = await (watch ? context : build)({
    bundle: true,
    platform: 'browser',
    entryPoints: ['prismarine-viewer/examples/webglRendererWorker.ts'],
    outfile: 'prismarine-viewer/public/webglRendererWorker.js',
    sourcemap: watch ? 'inline' : 'external',
    minify: !watch,
    logLevel: 'info',
    plugins: [
        {
            name: 'writeOutput',
            setup (build) {
                build.onEnd(({ outputFiles }) => {
                    for (const file of ['prismarine-viewer/public/webglRendererWorker.js', 'dist/webglRendererWorker.js']) {
                        fs.writeFileSync(file, outputFiles[0].text, 'utf8')
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
