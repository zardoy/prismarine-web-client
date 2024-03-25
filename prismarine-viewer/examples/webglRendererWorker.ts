import * as THREE from 'three'

//@ts-ignore
import VertShader from './_VertexShader.vert'
//@ts-ignore
import FragShader from './_FragmentShader.frag'

let blockStates
let newSectionsData = {}
let rendering = true
let cubePositions
let updateCubes

const camera = new THREE.PerspectiveCamera(75, 1 / 1, 0.1, 1000)

let renderedFrames = 0
setInterval(() => {
    // console.log('FPS:', renderedFrames)
    renderedFrames = 0
}, 1000)

const findTextureInBlockStates = (name): any => {
    const vars = blockStates[name]?.variants
    if (!vars) return
    let firstVar = Object.values(vars)[0] as any
    if (Array.isArray(firstVar)) firstVar = firstVar[0]
    if (!firstVar) return
    const elements = firstVar.model?.elements
    if (elements?.length !== 1) return
    return elements[0].faces
}

const updateSize = (width, height) => {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
}

const updateCubePositions = () => {
    updateCubes()
}

export const initWebglRenderer = async (canvas: HTMLCanvasElement, imageBlob: ImageBitmapSource, blockStatesJson: any) => {
    blockStates = blockStatesJson
    const textureBitmap = await createImageBitmap(imageBlob)
    const textureWidth = textureBitmap.width
    const textureHeight = textureBitmap.height

    const gl = canvas.getContext('webgl2')!

    const program = createProgram(gl, VertShader, FragShader)

    let vertices = new Float32Array([
        -0.5, -0.5, -0.5, 0.0, 0.0, // Bottom-let
        0.5, -0.5, -0.5, 1.0, 0.0, // bottom-right
        0.5, 0.5, -0.5, 1.0, 1.0, // top-right
        0.5, 0.5, -0.5, 1.0, 1.0, // top-right
        -0.5, 0.5, -0.5, 0.0, 1.0, // top-let
        -0.5, -0.5, -0.5, 0.0, 0.0, // bottom-let
        // ront ace
        -0.5, -0.5, 0.5, 0.0, 0.0, // bottom-let
        0.5, 0.5, 0.5, 1.0, 1.0, // top-right
        0.5, -0.5, 0.5, 1.0, 0.0, // bottom-right
        0.5, 0.5, 0.5, 1.0, 1.0, // top-right
        -0.5, -0.5, 0.5, 0.0, 0.0, // bottom-let
        -0.5, 0.5, 0.5, 0.0, 1.0, // top-let
        // Let ace
        -0.5, 0.5, 0.5, 1.0, 0.0, // top-right
        -0.5, -0.5, -0.5, 0.0, 1.0, // bottom-let
        -0.5, 0.5, -0.5, 1.0, 1.0, // top-let
        -0.5, -0.5, -0.5, 0.0, 1.0, // bottom-let
        -0.5, 0.5, 0.5, 1.0, 0.0, // top-right
        -0.5, -0.5, 0.5, 0.0, 0.0, // bottom-right
        // Right ace
        0.5, 0.5, 0.5, 1.0, 0.0, // top-let
        0.5, 0.5, -0.5, 1.0, 1.0, // top-right
        0.5, -0.5, -0.5, 0.0, 1.0, // bottom-right
        0.5, -0.5, -0.5, 0.0, 1.0, // bottom-right
        0.5, -0.5, 0.5, 0.0, 0.0, // bottom-let
        0.5, 0.5, 0.5, 1.0, 0.0, // top-let
        // Bottom ace
        -0.5, -0.5, -0.5, 0.0, 1.0, // top-right
        0.5, -0.5, 0.5, 1.0, 0.0, // bottom-let
        0.5, -0.5, -0.5, 1.0, 1.0, // top-let
        0.5, -0.5, 0.5, 1.0, 0.0, // bottom-let
        -0.5, -0.5, -0.5, 0.0, 1.0, // top-right
        -0.5, -0.5, 0.5, 0.0, 0.0, // bottom-right
        // Top ace
        -0.5, 0.5, -0.5, 0.0, 1.0, // top-let
        0.5, 0.5, -0.5, 1.0, 1.0, // top-right
        0.5, 0.5, 0.5, 1.0, 0.0, // bottom-right
        0.5, 0.5, 0.5, 1.0, 0.0, // bottom-right
        -0.5, 0.5, 0.5, 0.0, 0.0, // bottom-let
        -0.5, 0.5, -0.5, 0.0, 1.0  // top-let
    ])

    let NumberOfCube = 1_000_000

    cubePositions = new Float32Array(NumberOfCube * 3)
    let cubeTextureIndices = new Float32Array(NumberOfCube);


    // write random coordinates to cube positions xyz ten cubes;
    for (let i = 0; i < NumberOfCube * 3; i += 3) {
        cubePositions[i] = Math.random() * 1000 - 500;
        cubePositions[i + 1] = Math.random() * 1000 - 500;
        cubePositions[i + 2] = Math.random() * 100 - 100;
        cubeTextureIndices[i / 3] = Math.floor(Math.random() * 800);
        // cubeTextureIndices[i / 3] = 0;
    }
    cubePositions[0] = 0;
    cubePositions[1] = 0;
    cubePositions[2] = 0;

    let VAO = gl.createVertexArray();
    updateCubes = () => {
        // cubePositionsRaw = [
        //     // for now one cube in front of the camera
        //     [camera.position.x, camera.position.y, camera.position.z, 'dirt'],
        //     [camera.position.x + 2, camera.position.y, camera.position.z, 'dirt'],
        //     [camera.position.x - 2, camera.position.y, camera.position.z, 'dirt'],
        //     [camera.position.x, camera.position.y, camera.position.z + 2, 'dirt'],
        //     [camera.position.x, camera.position.y, camera.position.z - 2, 'dirt'],
        // ]
        const keys = Object.keys(newSectionsData);
        if (keys.length) {
            const cubePositionsRaw = keys.flatMap((key: any) => {
                const chunk = newSectionsData[key]
                return Object.entries(chunk.blocks).map(([pos, blockName]) => {
                    return [...pos.split(',').map(Number), blockName] as [number, number, number, string]
                })
            })
            NumberOfCube = cubePositionsRaw.length
            cubePositions = new Float32Array(NumberOfCube * 3)
            cubeTextureIndices = new Float32Array(NumberOfCube);
            for (let i = 0; i < NumberOfCube * 3; i += 3) {
                cubePositions[i] = cubePositionsRaw[i / 3][0]
                cubePositions[i + 1] = cubePositionsRaw[i / 3][1]
                cubePositions[i + 2] = cubePositionsRaw[i / 3][2]
                cubeTextureIndices[i / 3] = Math.floor(Math.random() * 800);
                const name = cubePositionsRaw[i / 3][3]
                const result = findTextureInBlockStates(name)?.north?.texture! ?? findTextureInBlockStates('sponge')?.north.texture!
                const tileSize = 16;
                function uvToTextureIndex (u, v) {
                    // Convert UV coordinates to pixel coordinates
                    let x = u * textureWidth;
                    let y = v * textureHeight;

                    // Convert pixel coordinates to tile index
                    const tileX = Math.floor(x / tileSize);
                    const tileY = Math.floor(y / tileSize);

                    // Calculate texture index
                    const textureIndex = tileY * (textureWidth / tileSize) + tileX;

                    return textureIndex;
                }
                cubeTextureIndices[i / 3] = uvToTextureIndex(result.u, result.v) - 1
            }
        }

        let instanceVBO = gl.createBuffer();
        let instanceTextureID = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, instanceVBO);
        gl.bufferData(gl.ARRAY_BUFFER, cubePositions, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        gl.bindBuffer(gl.ARRAY_BUFFER, instanceTextureID);
        gl.bufferData(gl.ARRAY_BUFFER, cubeTextureIndices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        VAO = gl.createVertexArray();
        let VBO = gl.createBuffer();
        //EBO = gl.createBuffer();

        gl.bindVertexArray(VAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, VBO)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * 4, 0)
        gl.enableVertexAttribArray(0)

        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * 4, 3 * 4)
        gl.enableVertexAttribArray(1)
        //instance data

        gl.enableVertexAttribArray(2);
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceVBO);
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 3 * 4, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.vertexAttribDivisor(2, 1);

        gl.enableVertexAttribArray(3);
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceTextureID);
        gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 1 * 4, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.vertexAttribDivisor(3, 1);
    }

    updateCubes()
    globalThis.updateCubes = updateCubes



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

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, textureWidth, textureHeight, 0, gl.RGB, gl.UNSIGNED_BYTE, textureBitmap);
    //gl.generateMipmap(gl.TEXTURE_2D);

    const texture2 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture2);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);	// set texture wrapping to GL_REPEAT (default wrapping method)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, textureWidth, textureHeight, 0, gl.RGB, gl.UNSIGNED_BYTE, textureBitmap);
    //gl.generateMipmap(gl.TEXTURE_2D);

    gl.useProgram(program)



    gl.uniform1i(gl.getUniformLocation(program, "texture1"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "texture2"), 1);


    gl.enable(gl.DEPTH_TEST)
    gl.frontFace(gl.CCW)
    gl.enable(gl.CULL_FACE)


    //gl.generateMipmap()
    //gl.enable(gl)
    //gl.clearColor(0, 0, 0, 1)
    //gl.clear(gl.COLOR_BUFFER_BIT)

    let ViewUniform = gl.getUniformLocation(program, "view")
    let ProjectionUniform = gl.getUniformLocation(program, "projection")

    gl.cullFace(gl.FRONT)

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture2);

    updateSize(gl.canvas.width, gl.canvas.height)
    const renderLoop = (performance) => {
        requestAnimationFrame(renderLoop)
        if (!rendering) return
        // gl.canvas.width = window.innerWidth * window.devicePixelRatio
        // gl.canvas.height = window.innerHeight * window.devicePixelRatio
        if (newWidth || newHeight) {
            gl.canvas.width = newWidth ?? gl.canvas.width
            gl.canvas.height = newHeight ?? gl.canvas.height
            newWidth = undefined
            newHeight = undefined
            updateSize(gl.canvas.width, gl.canvas.height)
        }
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

        let view = new THREE.Matrix4();
        // Rotate the view matrix around the X axis by yaw (in radians)
        const yaw = camera.rotation.x
        const pitch = camera.rotation.y
        view.makeRotationX(yaw * Math.PI / 4);
        // Rotate the view matrix around the Y axis by pitch (in radians)
        view.multiply(new THREE.Matrix4().makeRotationY(pitch * Math.PI / 180));
        // Translate the view matrix by the vector [x, y, z]
        view.multiply(new THREE.Matrix4().makeTranslation(camera.position.x, camera.position.y, camera.position.z));

        gl.clearColor(0.5, 0.5, 0.5, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.clear(gl.DEPTH_BUFFER_BIT)

        gl.useProgram(program)


        camera.updateMatrix()
        camera.updateProjectionMatrix()
        gl.uniformMatrix4fv(ViewUniform, false, view.elements);
        gl.uniformMatrix4fv(ProjectionUniform, false, camera.projectionMatrix.elements);



        gl.bindVertexArray(VAO)

        //gl.bindVertexArray(instanceVBO)
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, NumberOfCube);
        //gl.bindVertexArray(null)

        renderedFrames++
    }
    requestAnimationFrame(renderLoop)

    // gl.deleteVertexArray(VAO);
    // gl.deleteBuffer(VBO)
    // gl.deleteBuffer(EBO)
    // gl.deleteProgram(program)

    return canvas
}

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
onmessage = function (e) {
    if (!started) {
        started = true
        initWebglRenderer(e.data.canvas, e.data.imageBlob, e.data.blockStatesJson)
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
        newSectionsData[e.data.key] = e.data.data
        updateCubes?.()
    }
    if (e.data.type === 'camera') {
        camera.position.set(e.data.camera.position.x, e.data.camera.position.y, e.data.camera.position.z)
        camera.rotation.set(e.data.camera.rotation.x, e.data.camera.rotation.y, e.data.camera.rotation.z, 'ZYX')
    }
}
