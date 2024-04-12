import * as THREE from 'three'

//@ts-ignore
import VertShader from './_VertexShader.vert'
//@ts-ignore
import FragShader from './_FragmentShader.frag'
import { BlockFaceType, BlockType } from './shared'
import * as tweenJs from '@tweenjs/tween.js'

let allSides = [] as [number, number, number, BlockFaceType][]
let allSidesAdded = 0
let needsSidesUpdate = false

let chunksArrIndexes = {}
let freeArrayIndexes = [] as [number, number][]
let rendering = true
let sidePositions
let updateCubes: (startIndex: any, forceUpdate?) => void
let lastNotUpdatedIndex
let lastNotUpdatedArrSize
let animationTick = 0;

const updateCubesWhenAvailable = (pos) => {
    if (updateCubes) {
        updateCubes(pos)
    } else {
        setTimeout(updateCubesWhenAvailable, 100)
    }
}

const camera = new THREE.PerspectiveCamera(75, 1 / 1, 0.1, 1000)

let renderedFrames = 0
setInterval(() => {
    // console.log('FPS:', renderedFrames)
    postMessage({ type: 'fps', fps: renderedFrames })
    renderedFrames = 0
}, 1000)

const updateSize = (width, height) => {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
}


export const initWebglRenderer = async (canvas: HTMLCanvasElement, imageBlob: ImageBitmapSource, isPlayground: boolean, FragShaderOverride?) => {
    // isPlayground = false
    // blockStates = blockStatesJson
    const textureBitmap = await createImageBitmap(imageBlob)
    const textureWidth = textureBitmap.width
    const textureHeight = textureBitmap.height

    const gl = canvas.getContext('webgl2')!

    const program = createProgram(gl, VertShader, FragShaderOverride || FragShader)

    let CubeMesh = new Float32Array([
        -0.5, -0.5, -0.5, 0.0, 0.0, 0.0, // Bottom-let
        0.5, -0.5, -0.5, 1.0, 0.0, 0.0, // bottom-right
        0.5, 0.5, -0.5, 1.0, 1.0, 0.0, // top-right
        0.5, 0.5, -0.5, 1.0, 1.0, 0.0, // top-right
        -0.5, 0.5, -0.5, 0.0, 1.0, 0.0, // top-let
        -0.5, -0.5, -0.5, 0.0, 0.0, 0.0, // bottom-let
        // ront ace
        -0.5, -0.5, 0.5, 0.0, 0.0, 1.0, // bottom-let
        0.5, 0.5, 0.5, 1.0, 1.0, 1.0, // top-right
        0.5, -0.5, 0.5, 1.0, 0.0, 1.0, // bottom-right
        0.5, 0.5, 0.5, 1.0, 1.0, 1.0,// top-right
        -0.5, -0.5, 0.5, 0.0, 0.0, 1.0,// bottom-let
        -0.5, 0.5, 0.5, 0.0, 1.0, 1.0,// top-let
        // Let ace
        -0.5, 0.5, 0.5, 1.0, 0.0, 2.0,// top-right
        -0.5, -0.5, -0.5, 0.0, 1.0, 2.0,// bottom-let
        -0.5, 0.5, -0.5, 1.0, 1.0, 2.0,// top-let
        -0.5, -0.5, -0.5, 0.0, 1.0, 2.0,// bottom-let
        -0.5, 0.5, 0.5, 1.0, 0.0, 2.0, // top-right
        -0.5, -0.5, 0.5, 0.0, 0.0, 2.0,// bottom-right
        // Right ace
        0.5, 0.5, 0.5, 1.0, 0.0, 3.0,// top-let
        0.5, 0.5, -0.5, 1.0, 1.0, 3.0,// top-right
        0.5, -0.5, -0.5, 0.0, 1.0, 3.0,// bottom-right
        0.5, -0.5, -0.5, 0.0, 1.0, 3.0,// bottom-right
        0.5, -0.5, 0.5, 0.0, 0.0, 3.0,// bottom-let
        0.5, 0.5, 0.5, 1.0, 0.0, 3.0, // top-let
        // Bottom ace
        -0.5, -0.5, -0.5, 0.0, 1.0, 4.0,// top-right
        0.5, -0.5, 0.5, 1.0, 0.0, 4.0,// bottom-let
        0.5, -0.5, -0.5, 1.0, 1.0, 4.0,// top-let
        0.5, -0.5, 0.5, 1.0, 0.0, 4.0, // bottom-let
        -0.5, -0.5, -0.5, 0.0, 1.0, 4.0, // top-right
        -0.5, -0.5, 0.5, 0.0, 0.0, 4.0, // bottom-right
        // Top ace
        -0.5, 0.5, -0.5, 0.0, 1.0, 5.0,// top-let
        0.5, 0.5, -0.5, 1.0, 1.0, 5.0,// top-right
        0.5, 0.5, 0.5, 1.0, 0.0, 5.0,// bottom-right
        0.5, 0.5, 0.5, 1.0, 0.0, 5.0,// bottom-right
        -0.5, 0.5, 0.5, 0.0, 0.0, 5.0,// bottom-let
        -0.5, 0.5, -0.5, 0.0, 1.0, 5.0// top-let
    ])

    let SideMesh = new Float32Array([
        -0.5, -0.5, -0.5, 0.0, 0.0, // Bottom-let
        0.5, -0.5, -0.5, 1.0, 0.0, // bottom-right
        -0.5, 0.5, -0.5, 0.0, 1.0, // top-let
        0.5, 0.5, -0.5, 1.0, 1.0, // top-right
        // 0.5, 0.5, -0.5, 1.0, 1.0, // top-right
        // -0.5, -0.5, -0.5, 0.0, 0.0, // bottom-let
        // ront ace
    ])



    let NumberOfCube = isPlayground ? 10_000 : 16_000_000

    sidePositions = new Float32Array(NumberOfCube * 3 * 6)
    let sideTextureIndices = new Float32Array(NumberOfCube * 1 * 6);
    let sideIndexes = new Float32Array(NumberOfCube * 1 * 6);
    let sideBiomeColor = new Float32Array(NumberOfCube * 3 * 6);


    // write random coordinates to cube positions xyz ten cubes;
    if (isPlayground) {
        for (let i = 0; i < NumberOfCube * 18; i += 18) {

            sidePositions[i] = Math.floor(Math.random() * 1000) - 500;
            sidePositions[i + 1] = Math.floor(Math.random() * 1000) - 500;
            sidePositions[i + 2] = Math.floor(Math.random() * 100) - 100;

            sideBiomeColor[i] = (Math.random());
            sideBiomeColor[i + 1] = (Math.random());
            sideBiomeColor[i + 2] = (Math.random());
            for (let j = 1; j <= 6; j++) {

                if (j != 6) {
                    sidePositions[j * 3 + i] = sidePositions[i]
                    sidePositions[j * 3 + i + 1] = sidePositions[i + 1]
                    sidePositions[j * 3 + i + 2] = sidePositions[i + 2]

                    sideBiomeColor[j * 3 + i] = sideBiomeColor[i]
                    sideBiomeColor[j * 3 + i + 1] = sideBiomeColor[i + 1]
                    sideBiomeColor[j * 3 + i + 2] = sideBiomeColor[i + 2]
                }

                sideIndexes[i / 3 + j - 1] = j - 1;
                sideTextureIndices[i / 3 + j - 1] = Math.floor(Math.random() * 800);
                //sideTextureIndices[i / 3 + j - 1] = 1;
            }

        }

    }
    let VAO = gl.createVertexArray();


    let instanceVBO = gl.createBuffer();
    let instanceTextureID = gl.createBuffer();
    let instanceBiomeColor = gl.createBuffer();
    let instanceCubeSide = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, instanceVBO);
    gl.bufferData(gl.ARRAY_BUFFER, sidePositions, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindBuffer(gl.ARRAY_BUFFER, instanceTextureID);
    gl.bufferData(gl.ARRAY_BUFFER, sideTextureIndices, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBiomeColor);
    gl.bufferData(gl.ARRAY_BUFFER, sideBiomeColor, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindBuffer(gl.ARRAY_BUFFER, instanceCubeSide);
    gl.bufferData(gl.ARRAY_BUFFER, sideIndexes, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    VAO = gl.createVertexArray();
    let VBO = gl.createBuffer();
    // let VBO_sides = gl.createBuffer();
    //EBO = gl.createBuffer();

    gl.bindVertexArray(VAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, VBO)
    // gl.bindBuffer(gl.ARRAY_BUFFER, VBO_sides)
    gl.bufferData(gl.ARRAY_BUFFER, SideMesh, gl.STATIC_DRAW)

    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * 4, 0)
    gl.enableVertexAttribArray(0)

    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * 4, 3 * 4)
    gl.enableVertexAttribArray(1)

    gl.enableVertexAttribArray(2);
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceCubeSide);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 4, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.vertexAttribDivisor(2, 1);

    gl.enableVertexAttribArray(3);
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceVBO);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 3 * 4, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.vertexAttribDivisor(3, 1);

    gl.enableVertexAttribArray(4);
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceTextureID);
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 4 * 1, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.vertexAttribDivisor(4, 1);

    gl.enableVertexAttribArray(6);
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBiomeColor);
    gl.vertexAttribPointer(6, 3, gl.FLOAT, false, 3 * 4, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.vertexAttribDivisor(6, 1);

    updateCubes = (startIndex, forceUpdate) => {
        // up2
        const newSides = allSides.slice(startIndex, lastNotUpdatedArrSize ? startIndex + lastNotUpdatedArrSize : undefined)
        newSides.sort((a, b) => {
            const getScore = (b: BlockFaceType) => b.isTransparent ? 1 : 0
            return getScore(a[3]) - getScore(b[3])
        })
        globalThis.allSidesSize = allSides.length
        sidePositions = new Float32Array(newSides.length * 3)
        sideTextureIndices = new Float32Array(newSides.length * 1);
        sideIndexes = new Float32Array(newSides.length * 1);
        sideBiomeColor = new Float32Array(newSides.length * 3);
        for (let i = 0; i < newSides.length * 3; i += 3) {
            sidePositions[i] = newSides[i / 3][0]
            sidePositions[i + 1] = newSides[i / 3][1]
            sidePositions[i + 2] = newSides[i / 3][2]
            const block = newSides[i / 3][3] as BlockFaceType
            if (block.tint) {
                const [r, g, b] = block.tint
                sideBiomeColor[i] = r
                sideBiomeColor[i + 1] = g
                sideBiomeColor[i + 2] = b
            } else {
                sideBiomeColor[i] = 1
                sideBiomeColor[i + 1] = 1
                sideBiomeColor[i + 2] = 1
            }
            sideTextureIndices[i / 3] = block.textureIndex
            sideIndexes[i / 3] = block.face
        }


        // startIndex = 0 // TODO!
        console.log('startIndex', startIndex, sidePositions.length, allSides.length)
        const prepareBuffersUpdate = allSides.length > NumberOfCube || globalThis.testUpdate
        globalThis.testUpdate = false
        if (prepareBuffersUpdate) {
            NumberOfCube += 1_000_000
            updateCubes(0, true)
            return
        }
        globalThis.NumberOfCube = NumberOfCube

        const supplyData = (data, step) => {
            if (forceUpdate) {
                globalThis.updatedBufferSize = NumberOfCube
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(NumberOfCube * step), gl.STATIC_DRAW);
            }
            gl.bufferSubData(gl.ARRAY_BUFFER, startIndex * 4 * step, data); // update buffer content
            const error = gl.getError()
            if (error) throw new Error("SUBDATA ERROR")
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, instanceVBO);
        supplyData(sidePositions, 3)

        gl.bindBuffer(gl.ARRAY_BUFFER, instanceTextureID);
        supplyData(sideTextureIndices, 1)

        gl.bindBuffer(gl.ARRAY_BUFFER, instanceBiomeColor);
        supplyData(sideBiomeColor, 3)

        gl.bindBuffer(gl.ARRAY_BUFFER, instanceCubeSide);
        supplyData(sideIndexes, 1)

        allSidesAdded = allSides.length
        needsSidesUpdate = true
    }

    globalThis.updateCubes = updateCubes
    const cleanupFirstChunks = () => {
        allSides = []
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceVBO);
        // empty the buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(NumberOfCube * 3), gl.STATIC_DRAW); // todo
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        gl.bindBuffer(gl.ARRAY_BUFFER, instanceTextureID);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(NumberOfCube * 3), gl.STATIC_DRAW); // todo
        // gl.bufferSubData(gl.ARRAY_BUFFER, startIndex * 4, cubeTextureIndices); // update buffer content
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    fullReset = () => {
        cleanupFirstChunks()
        lastNotUpdatedIndex = undefined
        lastNotUpdatedArrSize = undefined
    }



    //gl.bindBuffer(gl.ARRAY_BUFFER, null);
    //gl.bindVertexArray(null)

    // viewer.world.updateTexturesData()
    // await new Promise(resolve => {
    //     // console.log('viewer.world.material.map!.image', viewer.world.material.map!.image)
    //     // viewer.world.material.map!.image.onload = () => {
    //     //   console.log(this.material.map!.image)
    //     //   resolve()
    //     // }
    //     viewer.world.renderUpdateEmitter.once('blockStatesDownloaded', resolve)
    // })
    // const names = Object.keys(viewer.world.downloadedBlockStatesData)

    let texture1 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture1);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);	// set texture wrapping to GL_REPEAT (default wrapping method)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, textureBitmap);

    gl.useProgram(program)

    gl.uniform1i(gl.getUniformLocation(program, "texture1"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "texture2"), 1);


    gl.enable(gl.DEPTH_TEST)
    gl.frontFace(gl.CCW)
    gl.enable(gl.CULL_FACE)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


    //gl.generateMipmap()
    //gl.enable(gl)
    //gl.clearColor(0, 0, 0, 1)
    //gl.clear(gl.COLOR_BUFFER_BIT)
    camera.up = new THREE.Vector3(0, 1, 0)

    let ViewUniform = gl.getUniformLocation(program, "view")
    let ProjectionUniform = gl.getUniformLocation(program, "projection")
    let TickUniform = gl.getUniformLocation(program, "tick")

    gl.cullFace(gl.FRONT)

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture1);

    gl.bindVertexArray(VAO)
    gl.useProgram(program)
    updateSize(gl.canvas.width, gl.canvas.height)
    const renderLoop = (performance) => {
        requestAnimationFrame(renderLoop)
        if (!rendering && !needsSidesUpdate) return
        // gl.canvas.width = window.innerWidth * window.devicePixelRatio
        // gl.canvas.height = window.innerHeight * window.devicePixelRatio
        if (newWidth || newHeight) {
            gl.canvas.width = newWidth ?? gl.canvas.width
            gl.canvas.height = newHeight ?? gl.canvas.height
            newWidth = undefined
            newHeight = undefined
            updateSize(gl.canvas.width, gl.canvas.height)

            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        }


        gl.clearColor(0.6784313725490196, 0.8470588235294118, 0.9019607843137255, 1);
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.clear(gl.DEPTH_BUFFER_BIT)


        tweenJs.update()
        camera.updateMatrix()
        gl.uniformMatrix4fv(ViewUniform, false, camera.matrix.invert().elements);
        gl.uniformMatrix4fv(ProjectionUniform, false, camera.projectionMatrix.elements);
        gl.uniform1i(TickUniform, animationTick);

        if (!globalThis.stopRendering) {
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, (isPlayground ? NumberOfCube * 6 : allSidesAdded));
            needsSidesUpdate = false
        }

        renderedFrames++
    }
    requestAnimationFrame(renderLoop)

    // gl.deleteVertexArray(VAO);
    // gl.deleteBuffer(VBO)
    // gl.deleteBuffer(EBO)
    // gl.deleteProgram(program)

    return canvas
}

let fullReset

const createProgram = (gl: WebGL2RenderingContext, vertexShader: string, fragmentShader: string) => {
    const createShader = (gl: WebGL2RenderingContext, type: number, source: string) => {
        const shaderName = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'
        const shader = gl.createShader(type)!
        gl.shaderSource(shader, source)
        gl.compileShader(shader)

        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
        if (!success) {
            const info = gl.getShaderInfoLog(shader)
            gl.deleteShader(shader)
            throw new Error(`Shader ${shaderName} compile error: ` + info)
        }
        return shader
    }



    const program = gl.createProgram()!
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShader)!)
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShader)!)
    gl.linkProgram(program)
    const linkSuccess = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (!linkSuccess) {
        const info = gl.getProgramInfoLog(program)
        gl.deleteProgram(program)
        throw new Error('Program link error: ' + info)
    }
    return program
}

let started = false
let newWidth: number | undefined
let newHeight: number | undefined
let autoTickUpdate = undefined as number | undefined
onmessage = function (e) {
    if (!started) {
        started = true
        initWebglRenderer(e.data.canvas, e.data.imageBlob, e.data.isPlayground, e.data.FragShaderOverride)
        return
    }
    if (e.data.type === 'startRender') {
        rendering = true
    }
    if (e.data.type === 'stopRender') {
        rendering = false
    }
    if (e.data.type === 'resize') {
        newWidth = e.data.newWidth
        newHeight = e.data.newHeight
    }
    if (e.data.type === 'addBlocksSection') {
        const currentLength = allSides.length;
        // in: object - name, out: [x, y, z, name]
        const newData = Object.entries(e.data.data.blocks).flatMap(([key, value]) => {
            const [x, y, z] = key.split(',').map(Number)
            const block = value as BlockType
            return block.sides.map((side) => {
                return [x, y, z, side] as [number, number, number, BlockFaceType]
            })
        })
        // find freeIndexes if possible
        const freeArea = freeArrayIndexes.find(([startIndex, endIndex]) => endIndex - startIndex >= newData.length)
        if (freeArea) {
            const [startIndex, endIndex] = freeArea
            allSides.splice(startIndex, newData.length, ...newData)
            lastNotUpdatedIndex ??= startIndex
            const freeAreaIndex = freeArrayIndexes.indexOf(freeArea)
            freeArrayIndexes[freeAreaIndex] = [startIndex + newData.length, endIndex]
            if (freeArrayIndexes[freeAreaIndex][0] >= freeArrayIndexes[freeAreaIndex][1]) {
                freeArrayIndexes.splice(freeAreaIndex, 1)
                // todo merge
            }
            lastNotUpdatedArrSize = newData.length
            console.log('using free area', freeArea)
        }

        chunksArrIndexes[e.data.key] = [currentLength, currentLength + newData.length]
        allSides.push(...newData)
        lastNotUpdatedIndex ??= currentLength
        // updateCubes?.(currentLength)
    }
    if (e.data.type === 'addBlocksSectionDone') {
        updateCubes?.(lastNotUpdatedIndex)
        lastNotUpdatedIndex = undefined
        lastNotUpdatedArrSize = undefined
    }
    if (e.data.type === 'removeBlocksSection') {
        // const [startIndex, endIndex] = chunksArrIndexes[e.data.key]
        // freeArrayIndexes.push([startIndex, endIndex])

        // // merge freeArrayIndexes TODO
        // if (freeArrayIndexes.at(-1)[0] === freeArrayIndexes.at(-2)?.[1]) {
        //     const [startIndex, endIndex] = freeArrayIndexes.pop()!
        //     const [startIndex2, endIndex2] = freeArrayIndexes.pop()!
        //     freeArrayIndexes.push([startIndex2, endIndex])
        // }
    }
    if (e.data.type === 'camera') {
        camera.rotation.set(e.data.camera.rotation.x, e.data.camera.rotation.y, e.data.camera.rotation.z, 'ZYX')
        // camera.position.set(e.data.camera.position.x, e.data.camera.position.y, e.data.camera.position.z)
        new tweenJs.Tween(camera.position).to({ x: e.data.camera.position.x, y: e.data.camera.position.y, z: e.data.camera.position.z }, 300).start() // 50
    }
    if (e.data.type === 'animationTick') {
        if (e.data.frames <= 0) {
            autoTickUpdate = undefined
            animationTick = 0
            return
        }
        if (e.data.tick === -1) {
            autoTickUpdate = e.data.frames
        } else {
            autoTickUpdate = undefined
            animationTick = e.data.tick % 20 // todo update automatically in worker
        }
    }
    if (e.data.type === 'fullReset') {
        fullReset()
    }
    if (e.data.type === 'exportData') {
        const exported = exportData();
        postMessage({ type: 'exportData', data: exported }, undefined, [exported.sides.buffer])
    }
    if (e.data.type === 'loadFixture') {
        // allSides = e.data.json.map(([x, y, z, face, textureIndex]) => {
        //     return [x, y, z, { face, textureIndex }] as [number, number, number, BlockFaceType]
        // })
        const dataSize = e.data.json.length / 5
        for (let i = 0; i < e.data.json.length; i += 5) {
            allSides.push([e.data.json[i], e.data.json[i + 1], e.data.json[i + 2], { face: e.data.json[i + 3], textureIndex: e.data.json[i + 4] }])
        }
        updateCubesWhenAvailable(0)
    }
}

globalThis.testDuplicates = () => {
    const duplicates = allSides.filter((value, index, self) => self.indexOf(value) !== index)
    console.log('duplicates', duplicates)
}

const exportData = () => {
    // Calculate the total length of the final array
    const totalLength = allSides.length * 5;

    // Create a new Int16Array with the total length
    const flatData = new Int16Array(totalLength);

    // Fill the flatData array
    for (let i = 0; i < allSides.length; i++) {
        const [x, y, z, side] = allSides[i];
        flatData.set([x, y, z, side.face, side.textureIndex], i * 5);
    }

    return { sides: flatData };
}

setInterval(() => {
    if (autoTickUpdate) {
        animationTick = (animationTick + 1) % autoTickUpdate;
    }
}, 1000 / 20)
