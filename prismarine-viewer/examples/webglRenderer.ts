import * as THREE from 'three'
import { m4 } from 'twgl.js'
import Stats from 'stats.js'

//@ts-ignore
import VertShader from './_VertexShader.vert'
//@ts-ignore
import FragShader from './_FragmentShader.frag'

//@ts-ignore
import Dirt from 'minecraft-assets/minecraft-assets/data/1.17.1/blocks/dirt.png'
//@ts-ignore
import Stone from 'minecraft-assets/minecraft-assets/data/1.17.1/blocks/stone.png'
import { Viewer } from '../viewer/lib/viewer'
import { findTextureInBlockStates } from '../../src/playerWindows'

declare const viewer: Viewer

let renderLoop
export const makeRender = () => {
    renderLoop?.()
}

let cubePositions
let updateCubes
export const updateCubePositions = () => {
    updateCubes()
}

export let cubePositionsRaw = [] as [number, number, number, string | null][]

export const initWebglRenderer = async (version) => {
    const stats = new Stats()
    const canvas = document.createElement('canvas')
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

    let instanceVBO = gl.createBuffer();
    let instanceTextureID = gl.createBuffer();
    updateCubes = () => {
        return
        // cubePositionsRaw = [
        //     // for now one cube in front of the camera
        //     [viewer.camera.position.x, viewer.camera.position.y, viewer.camera.position.z, 'dirt'],
        //     [viewer.camera.position.x + 2, viewer.camera.position.y, viewer.camera.position.z, 'dirt'],
        //     [viewer.camera.position.x - 2, viewer.camera.position.y, viewer.camera.position.z, 'dirt'],
        //     [viewer.camera.position.x, viewer.camera.position.y, viewer.camera.position.z + 2, 'dirt'],
        //     [viewer.camera.position.x, viewer.camera.position.y, viewer.camera.position.z - 2, 'dirt'],
        // ]

        cubePositions = new Float32Array(cubePositionsRaw.length * 3)
        cubeTextureIndices = new Float32Array(cubePositionsRaw.length);

        cubePositionsRaw.forEach(([x, y, z, name], i) => {
            cubePositions[i * 3] = x
            cubePositions[i * 3 + 1] = y
            cubePositions[i * 3 + 2] = z
            // just set index to 0 for now
            cubeTextureIndices[i] = 0
        })


        gl.bindBuffer(gl.ARRAY_BUFFER, instanceVBO);
        gl.bufferData(gl.ARRAY_BUFFER, cubePositions, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        gl.bindBuffer(gl.ARRAY_BUFFER, instanceTextureID);
        gl.bufferData(gl.ARRAY_BUFFER, cubeTextureIndices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, instanceVBO);
    gl.bufferData(gl.ARRAY_BUFFER, cubePositions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindBuffer(gl.ARRAY_BUFFER, instanceTextureID);
    gl.bufferData(gl.ARRAY_BUFFER, cubeTextureIndices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // updateCubes()
    globalThis.updateCubes = updateCubes


    let VBO, VAO = gl.createVertexArray();
    VBO = gl.createBuffer();
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

    //gl.bindBuffer(gl.ARRAY_BUFFER, null);
    //gl.bindVertexArray(null)

    let image = new Image();
    // simple black white chess image 10x10
    image.src = Dirt
    let image2 = new Image();
    // simple black white chess image 10x10
    image2.src = `/textures/${version}.png`

    console.log(image.src)
    await new Promise((resolve) => {
        image.onload = resolve
    })
    await new Promise((resolve) => {
        image2.onload = resolve
    })

    const keys = (e) => {
        const code = e.code
        const pressed = e.type === 'keydown'
        if (pressed) {
            if (code === 'KeyW') {
                viewer.camera.position.z -= 1
            }
            if (code === 'KeyS') {
                viewer.camera.position.z += 1
            }
            if (code === 'KeyA') {
                viewer.camera.position.x -= 1
            }
            if (code === 'KeyD') {
                viewer.camera.position.x += 1
            }
            if (code === 'ShiftLeft') {
                viewer.camera.position.y -= 0.5
            }
            if (code === 'Space') {
                viewer.camera.position.y += 0.5
            }
        }
    }
    window.addEventListener('keydown', keys)
    window.addEventListener('keyup', keys)

    // mouse
    const mouse = { x: 0, y: 0 }
    const mouseMove = (e: PointerEvent) => {
        if (e.buttons === 1 || e.pointerType === 'touch') {
            viewer.camera.rotation.y += e.movementX / 20
            viewer.camera.rotation.x += e.movementY / 20
            console.log('viewer.camera.position', viewer.camera.position)
            // yaw += e.movementY / 20;
            // pitch += e.movementX / 20;
        }
        if (e.buttons === 2) {
            viewer.camera.position.set(0, 0, 0)
        }
    }
    window.addEventListener('pointermove', mouseMove)

    viewer.world.texturesVersion = version
    viewer.world.updateTexturesData()
    await new Promise(resolve => {
        // console.log('viewer.world.material.map!.image', viewer.world.material.map!.image)
        // viewer.world.material.map!.image.onload = () => {
        //   console.log(this.material.map!.image)
        //   resolve()
        // }
        viewer.world.renderUpdateEmitter.once('blockStatesDownloaded', resolve)
    })
    console.log(viewer.world.downloadedBlockStatesData)
    const names = Object.keys(viewer.world.downloadedBlockStatesData)

    let texture1 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture1);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);	// set texture wrapping to GL_REPEAT (default wrapping method)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, image.width, image.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image);
    //gl.generateMipmap(gl.TEXTURE_2D);

    let texture2 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture2);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);	// set texture wrapping to GL_REPEAT (default wrapping method)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, image2.width, image2.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image2);
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
    document.body.appendChild(canvas)

    let view = m4.lookAt([0, 0, 2], [0, 0, 0], [0, 1, 0])
    const projection = m4.perspective(75 * Math.PI / 180, gl.canvas.width / gl.canvas.height, 0.1, 2048)
    // view = m4.identity();
    // m4.rotateX(view, yaw * Math.PI / 180)
    // m4.rotateY(view, pitch * Math.PI / 180)
    // m4.translate(view, [x,y,z], view)
    let ModelUniform = gl.getUniformLocation(program, "model")
    let uvUniform = gl.getUniformLocation(program, "uv");
    let ViewUniform = gl.getUniformLocation(program, "view")
    let ProjectionUniform = gl.getUniformLocation(program, "projection")

    gl.cullFace(gl.FRONT)

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture2);



    // stats.addPanel(new Stats.Panel('FPS', '#0ff', '#002'))
    document.body.appendChild(stats.dom)
    renderLoop = (performance) => {
        stats.begin()
        gl.canvas.width = window.innerWidth * window.devicePixelRatio
        gl.canvas.height = window.innerHeight * window.devicePixelRatio
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

        view = m4.identity();
        const yaw = viewer.camera.rotation.x
        const pitch = viewer.camera.rotation.y
        m4.rotateX(view, yaw * Math.PI / 180, view)
        m4.rotateY(view, pitch * Math.PI / 180, view)
        m4.translate(view, [-viewer.camera.position.x, -viewer.camera.position.y, -viewer.camera.position.z], view)

        gl.clearColor(0.5, 0.5, 0.5, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.clear(gl.DEPTH_BUFFER_BIT)

        gl.useProgram(program)



        gl.uniformMatrix4fv(ViewUniform, false, view);
        gl.uniformMatrix4fv(ProjectionUniform, false, projection);



        gl.bindVertexArray(VAO)

        //gl.bindVertexArray(instanceVBO)
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, NumberOfCube);
        //gl.bindVertexArray(null)

        //let i = 0
        // const cubePositions = Object.values(viewer.world.newChunks).map((chunk: any) => {
        //     return Object.entries(chunk.blocks).map(([pos, block]) => {
        //         return [...pos.split(',').map(Number), block] as [number, number, number, string]
        //     })
        // }).flat()


        // cubePositions.forEach(([x, y, z, name]) => {
        //     const result = findTextureInBlockStates(name)?.north.texture!
        //     if (result || true) {
        //         const model = m4.identity()

        //         //m4.rotateX(model, performance / 1000*i/800 + Math.random() / 100, model);
        //         //m4.rotateY(model, performance / 2500*i/800 + Math.random() / 100, model)
        //         //m4.rotateZ(model, Math.random() / 1010, model)
        //         m4.translate(model, [x, y, z], model);
        //         gl.uniformMatrix4fv(ModelUniform, false, model);
        //         const u = i / 64;
        //         const v = i % 64;
        //         // const u = result.u + result.su
        //         // const v = result.v
        //         gl.uniform2fv(uvUniform, [u, v])

        //         i++
        //         i %= 800;

        //         gl.drawArrays(gl.TRIANGLES, 0, 36);
        //     }
        // })


        ///model.translate([0, 0, 0], model)

        //gl.Swa
        stats.end()
    }

    // gl.deleteVertexArray(VAO);
    // gl.deleteBuffer(VBO)
    // gl.deleteBuffer(EBO)
    // gl.deleteProgram(program)

}

export const createProgram = (gl: WebGL2RenderingContext, vertexShader: string, fragmentShader: string) => {
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
