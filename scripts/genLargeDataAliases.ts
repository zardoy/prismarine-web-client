import * as fs from 'fs'

export const genLargeDataAliases = async (isCompressed: boolean) => {
    const modules = {
        mcData: {
            raw: '../generated/minecraft-data-optimized.json',
            compressed: '../generated/mc-data-compressed.js',
        },
        blockStatesModels: {
            raw: 'mc-assets/dist/blockStatesModels.json',
            compressed: '../generated/mc-assets-compressed.js',
        }
    }

    const OUT_FILE = './generated/large-data-aliases.ts'

    let str = `${decoderCode}\nexport const importLargeData = async (mod: ${Object.keys(modules).map(x => `'${x}'`).join(' | ')}) => {\n`
    for (const [module, { compressed, raw }] of Object.entries(modules)) {
        let importCode = `(await import('${isCompressed ? compressed : raw}')).default`;
        if (isCompressed) {
            importCode = `JSON.parse(decompressFromBase64(${importCode}))`
        }
        str += `  if (mod === '${module}') return ${importCode}\n`
    }
    str += `}\n`

    fs.writeFileSync(OUT_FILE, str, 'utf8')
}

const decoderCode = /* ts */ `
import pako from 'pako';

function decompressFromBase64(input) {
    console.time('decompressFromBase64')
    // Decode the Base64 string
    const binaryString = atob(input);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    // Convert the binary string to a byte array
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Decompress the byte array
    const decompressedData = pako.inflate(bytes, { to: 'string' });

    console.timeEnd('decompressFromBase64')
    return decompressedData;
}
`

// execute if run directly
if (require.main === module) {
    console.log('running...')
    const isCompressed = process.argv.includes('--compressed')
    genLargeDataAliases(isCompressed)
}
