import * as THREE from 'three';
import { Vec3 } from 'vec3';
// import states from '../public/blocksStates/1.20.2.json'

export const render = (scene: THREE.Scene) => {
    const texture = 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.9/blocks/stone.png'
    const loader = new THREE.TextureLoader()
    const stoneUv = {
        "u": 0.515625,
        "v": 0.1875,
        "su": -0.015625,
        "sv": 0.015625
    }

    loader.load(texture, (texture) => {
        // const material = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, alphaTest: 0.1 })
        // material.map = texture
        // texture.magFilter = THREE.NearestFilter
        // texture.minFilter = THREE.NearestFilter

        const addBufferGeometry = (pos) => {
            const vertices = new Float32Array([
                -0.5, -0.5, 0.5, // v0
                0.5, -0.5, 0.5, // v1
                0.5, 0.5, 0.5, // v2
                -0.5, 0.5, 0.5, // v3
            ]);
            const colors = new Float32Array([
                1, 1, 1,
                1, 1, 1,
                1, 1, 1,
                1, 1, 1
            ]);
            const normals = new Float32Array([
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
                0, 0, 1
            ]);
            // const indices = new Uint16Array([
            //   0, 1, 2, 0, 2, 3
            // ])
            const indices = [
                0, 1, 2,
                2, 3, 0,
            ];
            const bufferGeometry = new THREE.BufferGeometry()
            bufferGeometry.setIndex(indices)
            bufferGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
            bufferGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
            bufferGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
            //   set uv
            const uvs = new Float32Array([
                stoneUv.u, stoneUv.v,
                stoneUv.u + stoneUv.su, stoneUv.v,
                stoneUv.u + stoneUv.su, stoneUv.v + stoneUv.sv,
                stoneUv.u, stoneUv.v + stoneUv.sv
            ])
            // explain: https://threejsfundamentals.org/threejs/lessons/threejs-custom-buffergeometry.html
            bufferGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
            //@ts-ignore
            const mesh = new THREE.Mesh(bufferGeometry, viewer.world.material)
            mesh.position.set(pos.x+0.5, pos.y+0.5, pos.z+0.5)
            scene.add(mesh)
        }

        const targetPos = new Vec3(2, 90, 2)
        addBufferGeometry(new Vec3(2, 90, 2))
        addBufferGeometry(new Vec3(1, 90, 2))
    })
}
