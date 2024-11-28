import { defineConfig, mergeRsbuildConfig } from '@rsbuild/core';
import supportedVersions from '../src/supportedVersions.mjs'
import childProcess from 'child_process'
import path, { dirname, join } from 'path'
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';
import fs from 'fs'
import { appAndRendererSharedConfig, rspackViewerConfig } from './rsbuildSharedConfig';

const mcDataPath = join(__dirname, '../generated/minecraft-data-optimized.json')

if (!fs.existsSync(mcDataPath)) {
    childProcess.execSync('tsx ./scripts/makeOptimizedMcData.mjs', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
}

export default mergeRsbuildConfig(
    appAndRendererSharedConfig(),
    defineConfig({
        html: {
            template: join(__dirname, './playground.html'),
        },
        output: {
            cleanDistPath: false,
            distPath: {
                root: join(__dirname, './dist'),
            },
        },
        server: {
            port: 9090,
        },
        source: {
            entry: {
                index: join(__dirname, './examples/playground.ts')
            },
            define: {
                'globalThis.includedVersions': JSON.stringify(supportedVersions),
            },
        },
    })
)
