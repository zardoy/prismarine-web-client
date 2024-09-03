import { defineConfig, RsbuildPluginAPI } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginTypedCSSModules } from '@rsbuild/plugin-typed-css-modules'
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill'
import { pluginTypeCheck } from '@rsbuild/plugin-type-check'
import path from 'path'
import childProcess from 'child_process'
import fs from 'fs'
import fsExtra from 'fs-extra'
import { promisify } from 'util'
import { generateSW } from 'workbox-build'
import { getSwAdditionalEntries } from './scripts/build'

//@ts-ignore
try { require('./localSettings.js') } catch { }

const execAsync = promisify(childProcess.exec)

const buildingVersion = new Date().toISOString().split(':')[0]

const dev = process.env.NODE_ENV === 'development'

export default defineConfig({
    dev: {
        progressBar: true,
        writeToDisk: true
    },
    html: {
        template: './index.html',
    },
    output: {
        polyfill: 'usage',
        externals: [
            'sharp'
        ],
        sourceMap: {
            js: 'source-map',
            css: true,
        },
        // 50kb limit for data uri
        dataUriLimit: 50 * 1024
    },
    source: {
        alias: {
            fs: './src/shims/fs.js',
            http: 'http-browserify',
            stream: 'stream-browserify',
            net: 'net-browserify',
            'minecraft-protocol$': 'minecraft-protocol/src/index.js',
            'buffer$': 'buffer',
            // avoid bundling, not used on client side
            'prismarine-auth': './src/shims/prismarineAuthReplacement.ts',
            perf_hooks: './src/shims/perf_hooks_replacement.js',
            crypto: './src/shims/crypto.js',
            dns: './src/shims/dns.js',
            yggdrasil: './src/shims/yggdrasilReplacement.ts',
            'three$': 'three/src/Three.js'
        },
        entry: {
            index: './src/index.ts',
        },
        // exclude: [
        //     /.woff$/
        // ],
        define: {
            'process.env.BUILD_VERSION': JSON.stringify(!dev ? buildingVersion : 'undefined'),
            'process.env.MAIN_MENU_LINKS': JSON.stringify(process.env.MAIN_MENU_LINKS),
            'process.platform': '"browser"',
            'process.env.GITHUB_URL':
                JSON.stringify(`https://github.com/${process.env.GITHUB_REPOSITORY || `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`}`),
            'process.env.DEPS_VERSIONS': JSON.stringify({})
        },
        decorators: {
            version: 'legacy', // default is a lie
        },
    },
    server: {
        // strictPort: true,
        htmlFallback: false,
        publicDir: false,
        // publicDir: {
        //     name: 'assets',
        // },
        headers: {
            // enable shared array buffer
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },
        open: process.env.OPEN_BROWSER === 'true',
        proxy: {
            '/api': 'http://localhost:8080',
        },
    },
    plugins: [
        pluginReact(),
        pluginTypedCSSModules(),
        pluginNodePolyfill(),
        {
            name: 'test',
            setup (build: RsbuildPluginAPI) {
                const prep = async () => {
                    console.time('total-prep')
                    fs.mkdirSync('./generated', { recursive: true })
                    if (!fs.existsSync('./generated/minecraft-data-optimized.json') || require('./generated/minecraft-data-optimized.json').versionKey !== require('minecraft-data/package.json').version) {
                        childProcess.execSync('tsx ./scripts/makeOptimizedMcData.mjs', { stdio: 'inherit' })
                    }
                    childProcess.execSync('tsx ./scripts/genShims.ts', { stdio: 'inherit' })
                    if (!fs.existsSync('./generated/latestBlockCollisionsShapes.json')) {
                        childProcess.execSync('tsx ./scripts/optimizeBlockCollisions.ts', { stdio: 'inherit' })
                    }
                    fsExtra.copySync('./node_modules/mc-assets/dist/other-textures/latest/entity', './dist/textures/entity')
                    fsExtra.copySync('./assets/background', './dist/background')
                    fs.copyFileSync('./assets/favicon.png', './dist/favicon.png')
                    fs.copyFileSync('./assets/manifest.json', './dist/manifest.json')
                    fs.copyFileSync('./assets/loading-bg.jpg', './dist/loading-bg.jpg')
                    const configJson = JSON.parse(fs.readFileSync('./config.json', 'utf8'))
                    if (dev) {
                        configJson.defaultProxy = ':8080'
                    }
                    fs.writeFileSync('./dist/config.json', JSON.stringify(configJson), 'utf8')
                    // childProcess.execSync('./scripts/prepareSounds.mjs', { stdio: 'inherit' })
                    // childProcess.execSync('tsx ./scripts/genMcDataTypes.ts', { stdio: 'inherit' })
                    // childProcess.execSync('tsx ./scripts/genPixelartTypes.ts', { stdio: 'inherit' })
                    if (fs.existsSync('./prismarine-viewer/public/mesher.js') && dev) {
                        // copy mesher
                        fs.copyFileSync('./prismarine-viewer/public/mesher.js', './dist/mesher.js')
                    } else if (!dev) {
                        await execAsync('pnpm run build-mesher')
                    }
                    if (fs.existsSync('./prismarine-viewer/public/webgpuRendererWorker.js')) {
                        // copy worker
                        fs.copyFileSync('./prismarine-viewer/public/webgpuRendererWorker.js', './dist/webgpuRendererWorker.js')
                    } else {
                        await execAsync('pnpm run build-other-workers')
                    }
                    fs.writeFileSync('./dist/version.txt', buildingVersion, 'utf-8')
                    console.timeEnd('total-prep')
                }
                if (!dev) {
                    build.onBeforeBuild(async () => {
                        prep()
                    })
                    build.onAfterBuild(async () => {
                        const { count, size, warnings } = await generateSW({
                            // dontCacheBustURLsMatching: [new RegExp('...')],
                            globDirectory: 'dist',
                            skipWaiting: true,
                            clientsClaim: true,
                            additionalManifestEntries: getSwAdditionalEntries(),
                            globPatterns: [],
                            swDest: './dist/service-worker.js',
                        })
                    })
                }
                build.onBeforeStartDevServer(() => prep())
            },
        },
    ],
    tools: {
        bundlerChain (chain, { CHAIN_ID }) {
        },
        rspack (config, { addRules, appendPlugins, rspack }) {
            appendPlugins(new rspack.NormalModuleReplacementPlugin(/data/, (resource) => {
                let absolute: string
                const request = resource.request.replaceAll('\\', '/')
                absolute = path.join(resource.context, request).replaceAll('\\', '/')
                if (request.includes('minecraft-data/data/pc/1.')) {
                    console.log('Error: incompatible resource', request, resource.contextInfo.issuer)
                    process.exit(1)
                    // throw new Error(`${resource.request} was requested by ${resource.contextInfo.issuer}`)
                }
                if (absolute.endsWith('/minecraft-data/data.js')) {
                    resource.request = path.join(__dirname, './src/shims/minecraftData.ts')
                }
            }))
            addRules([
                {
                    test: /\.obj$/,
                    type: 'asset/source',
                },
                {
                    test: /\.wgsl$/,
                    type: 'asset/source',
                },
                {
                    test: /\.mp3$/,
                    type: 'asset/source',
                }
            ])
            config.ignoreWarnings = [
                /the request of a dependency is an expression/,
                /Unsupported pseudo class or element: xr-overlay/
            ]
        }
    },
    // performance: {
    //     bundleAnalyze: {
    //         analyzerMode: 'json',
    //         reportFilename: 'report.json',
    //     },
    // },
})
