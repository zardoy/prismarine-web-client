//@ts-check

import { polyfillNode } from 'esbuild-plugin-polyfill-node'
import { join, dirname, basename } from 'path'
import * as fs from 'fs'
import { filesize } from 'filesize'

const prod = process.argv.includes('--prod')
let connectedClients = []

/** @type {import('esbuild').Plugin[]} */
const plugins = [
  {
    name: 'strict-aliases',
    setup (build) {
      build.onResolve({
        filter: /^minecraft-protocol$/,
      }, async ({ kind, resolveDir }) => {
        return {
          path: (await build.resolve('minecraft-protocol/src/index.js', { kind, resolveDir })).path,
        }
      })
      build.onLoad({
        filter: /minecraft-data[\/\\]data.js$/,
      }, (args) => {
        const defaultVersionsObj = {
          // default protocol data, needed for auto-version
          "1.20.1": {
            version: {
              "minecraftVersion": "1.20.1",
              "version": 763,
              "majorVersion": "1.20"
            },
            protocol: JSON.parse(fs.readFileSync(join(args.path, '..', 'minecraft-data/data/pc/1.20/protocol.json'), 'utf8')),
          }
        }
        return {
          contents: `window.mcData ??= ${JSON.stringify(defaultVersionsObj)};module.exports = { pc: window.mcData }`,
          loader: 'js',
        }
      })
      build.onResolve({
        filter: /^minecraft-assets$/,
      }, () => {
        throw new Error('hit banned package')
      })
    }
  },
  {
    name: 'data-assets',
    setup (build) {
      build.onResolve({
        filter: /.*/,
      }, async ({ path, ...rest }) => {
        if (['.woff', '.woff2', '.ttf'].some(ext => path.endsWith(ext)) || path.startsWith('extra-textures/')) {
          return {
            path,
            namespace: 'assets',
            external: true,
          }
        }
      })

      build.onEnd(async ({ metafile, outputFiles }) => {
        // write outputFiles
        //@ts-ignore
        for (const file of outputFiles) {
          await fs.promises.writeFile(file.path, file.contents)
        }
        if (!prod) return
        // const deps = Object.entries(metafile.inputs).sort(([, a], [, b]) => b.bytes - a.bytes).map(([x, { bytes }]) => [x, filesize(bytes)]).slice(0, 5)
        //@ts-ignore
        const sizeByExt = {}
        //@ts-ignore
        Object.entries(metafile.inputs).sort(([, a], [, b]) => b.bytes - a.bytes).forEach(([x, { bytes }]) => {
          const ext = x.slice(x.lastIndexOf('.'))
          sizeByExt[ext] ??= 0
          sizeByExt[ext] += bytes
        })
        console.log('Input size by ext:')
        console.log(Object.fromEntries(Object.entries(sizeByExt).map(x => [x[0], filesize(x[1])])))
      })
    },
  },
  {
    name: 'prevent-incorrect-linking',
    setup (build) {
      build.onResolve({
        filter: /.+/,
      }, async ({ resolveDir, path, importer, kind, pluginData }) => {
        if (pluginData?.__internal) return
        // not ideal as packages can have different version, on the other hand we should not have multiple versions of the same package of developing deps
        const packageName = path.startsWith('@') ? path.split('/', 2).join('/') : path.split('/', 1)[0]
        const localPackageToReuse = join('node_modules', packageName)
        if (!resolveDir.startsWith(process.cwd()) && ['./', '../'].every(x => !path.startsWith(x)) && fs.existsSync(localPackageToReuse)) {
          const redirected = await build.resolve(path, { kind: 'import-statement', resolveDir: process.cwd(), pluginData: { __internal: true }, })
          return redirected
        }
        // disallow imports from outside the root directory to ensure modules are resolved from node_modules of this workspace
        // if ([resolveDir, path].some(x => x.includes('node_modules')) && !resolveDir.startsWith(process.cwd())) {
        //   // why? ensure workspace dependency versions are used (we have overrides and need to dedupe so it doesn't grow in size)
        //   throw new Error(`Restricted package import from outside the root directory: ${resolveDir}`)
        // }
        return undefined
      })
    }
  },
  {
    name: 'watch-notify',
    setup (build) {
      let count = 0
      let time
      let prevHash
      build.onStart(() => {
        time = Date.now()
      })
      build.onEnd(({ errors, outputFiles: _outputFiles, metafile, warnings }) => {
        /** @type {import('esbuild').OutputFile[]} */
        // @ts-ignore
        const outputFiles = _outputFiles
        const elapsed = Date.now() - time
        outputFiles.find(outputFile => outputFile.path)

        if (errors.length) {
          connectedClients.forEach((res) => {
            res.write(`data: ${JSON.stringify({ errors: errors.map(error => error.text) })}\n\n`)
            res.flush()
          })
          return
        }

        // write metafile to disk if needed to analyze
        // fs.writeFileSync('dist/meta.json', JSON.stringify(metafile, null, 2))

        /** @type {import('esbuild').OutputFile} */
        //@ts-ignore
        const outputFile = outputFiles.find(x => x.path.endsWith('.js'))
        if (outputFile.hash === prevHash) {
          console.log('Ignoring reload as contents the same')
          return
        }
        prevHash = outputFile.hash
        let outputText = outputFile.text
        //@ts-ignore
        if (['inline', 'both'].includes(build.initialOptions.sourcemap)) {
          outputText = outputText.slice(0, outputText.indexOf('//# sourceMappingURL=data:application/json;base64,'))
        }
        console.log(`Done in ${elapsed}ms. Size: ${filesize(outputText.length)} (${build.initialOptions.minify ? 'minified' : 'without minify'})`)

        if (count++ === 0) {
          return
        }

        connectedClients.forEach((res) => {
          res.write(`data: ${JSON.stringify({ update: { time: elapsed } })}\n\n`)
          res.flush()
        })
        connectedClients.length = 0
      })
    }
  },
  {
    name: 'esbuild-readdir',
    setup (build) {
      build.onResolve({
        filter: /^esbuild-readdir:.+$/,
      }, ({ resolveDir, path }) => {
        return {
          namespace: 'esbuild-readdir',
          path,
          pluginData: {
            resolveDir: join(resolveDir, path.replace(/^esbuild-readdir:/, ''))
          },
        }
      })
      build.onLoad({
        filter: /.+/,
        namespace: 'esbuild-readdir',
      }, async ({ pluginData }) => {
        const { resolveDir } = pluginData
        const files = await fs.promises.readdir(resolveDir)
        return {
          contents: `module.exports = ${JSON.stringify(files)}`,
          resolveDir,
          loader: 'js',
        }
      })
    }
  },
  {
    name: 'esbuild-import-glob',
    setup (build) {
      build.onResolve({
        filter: /^esbuild-import-glob\(path:(.+),skipFiles:(.+)\)+$/,
      }, ({ resolveDir, path }) => {
        return {
          namespace: 'esbuild-import-glob',
          path,
          pluginData: {
            resolveDir
          },
        }
      })
      build.onLoad({
        filter: /.+/,
        namespace: 'esbuild-import-glob',
      }, async ({ pluginData, path }) => {
        const { resolveDir } = pluginData
        //@ts-ignore
        const [, userPath, skipFiles] = /^esbuild-import-glob\(path:(.+),skipFiles:(.+)\)+$/g.exec(path)
        const files = (await fs.promises.readdir(join(resolveDir, userPath))).filter(f => !skipFiles.includes(f))
        return {
          contents: `module.exports = { ${files.map(f => `'${f}': require('./${join(userPath, f)}')`).join(',')} }`,
          resolveDir,
          loader: 'js',
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
  {
    name: 'react-displayname',
    setup (build) {
      build.onLoad({
        filter: /.tsx$/,
      }, async ({ path }) => {
        let file = await fs.promises.readFile(path, 'utf8')
        const fileName = basename(path, '.tsx')
        let replaced = false
        const varName = `__${fileName}_COMPONENT`
        file = file.replace(/export default /, () => {
          replaced = true
          return `const ${varName} = `
        })
        if (replaced) {
          file += `;${varName}.displayName = '${fileName}';export default ${varName};`
        }

        return {
          contents: file,
          loader: 'tsx',
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
]

export { plugins, connectedClients as clients }
