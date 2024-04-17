import * as THREE from 'three'
import { Vec3 } from 'vec3'
import nbt from 'prismarine-nbt'
import { dispose3 } from './dispose'
import PrismarineChatLoader from 'prismarine-chat'
import { renderSign } from '../sign-renderer/'
import { chunkPos, sectionPos } from './simpleUtils'
import { WorldRendererCommon } from './worldrendererCommon'
import * as tweenJs from '@tweenjs/tween.js'
import { BloomPass, RenderPass, UnrealBloomPass, EffectComposer, WaterPass, GlitchPass } from 'three-stdlib'

function mod (x, n) {
    return ((x % n) + n) % n
}

export class WorldRendererThree extends WorldRendererCommon {
    outputFormat = 'threeJs' as const
    blockEntities = {}
    sectionObjects: Record<string, THREE.Object3D> = {}
    showChunkBorders = false
    chunkTextures = new Map<string, { [pos: string]: THREE.Texture }>()
    signsCache = new Map<string, any>()
    composer: EffectComposer<THREE.WebGLRenderTarget<THREE.Texture>>
    renderPass: RenderPass

    get tilesRendered () {
        return Object.values(this.sectionObjects).reduce((acc, obj) => acc + (obj as any).tilesCount, 0)
    }

    constructor(public scene: THREE.Scene, public renderer: THREE.WebGLRenderer, public camera: THREE.PerspectiveCamera, numWorkers = 4) {
        super(numWorkers)

        this.addRenderPasses()
    }

    addRenderPasses () {
        const target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
            type: THREE.HalfFloatType,
            format: THREE.RGBAFormat,
            colorSpace: THREE.SRGBColorSpace,
        })
        target.samples = 8
        this.composer = new EffectComposer(this.renderer)
        this.renderPass = new RenderPass(this.scene, this.camera)
        this.composer.addPass(this.renderPass)
        const unrealBloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 2, 0.5, 0.8)
        // unrealBloomPass.threshold = 1
        this.composer.addPass(unrealBloomPass)
        const waterPass = new WaterPass()
        waterPass.enabled = true
        waterPass.clear = false
        waterPass.setSize(window.innerWidth, window.innerHeight)
        this.composer.addPass(waterPass)
        // this.composer.addPass(new GlitchPass())
        this.handleResize = () => {
            this.composer.setSize(window.innerWidth, window.innerHeight)
        }
        this.handleResize()
    }

    /**
     * Optionally update data that are depedendent on the viewer position
     */
    updatePosDataChunk (key: string) {
        if (!this.viewerPosition) return
        const [x, y, z] = key.split(',').map(x => Math.floor(+x / 16))
        const [xPlayer, yPlayer, zPlayer] = this.viewerPosition.toArray().map(x => Math.floor(x / 16))
        // sum of distances: x + y + z
        const chunkDistance = Math.abs(x - xPlayer) + Math.abs(y - yPlayer) + Math.abs(z - zPlayer)
        const section = this.sectionObjects[key].children.find(child => child.name === 'mesh')!
        section.renderOrder = 500 - chunkDistance
    }

    updateViewerPosition (pos: Vec3): void {
        this.viewerPosition = pos
        for (const [key, value] of Object.entries(this.sectionObjects)) {
            if (!value) continue
            this.updatePosDataChunk(key)
        }
    }

    handleWorkerMessage (data: any): void {
        if (data.type !== 'geometry') return
        let object: THREE.Object3D = this.sectionObjects[data.key]
        if (object) {
            this.scene.remove(object)
            dispose3(object)
            delete this.sectionObjects[data.key]
        }

        const chunkCoords = data.key.split(',')
        if (!this.loadedChunks[chunkCoords[0] + ',' + chunkCoords[2]] || !data.geometry.positions.length || !this.active) return

        // if (!this.initialChunksLoad && this.enableChunksLoadDelay) {
        //   const newPromise = new Promise(resolve => {
        //     if (this.droppedFpsPercentage > 0.5) {
        //       setTimeout(resolve, 1000 / 50 * this.droppedFpsPercentage)
        //     } else {
        //       setTimeout(resolve)
        //     }
        //   })
        //   this.promisesQueue.push(newPromise)
        //   for (const promise of this.promisesQueue) {
        //     await promise
        //   }
        // }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(data.geometry.positions, 3))
        geometry.setAttribute('normal', new THREE.BufferAttribute(data.geometry.normals, 3))
        geometry.setAttribute('color', new THREE.BufferAttribute(data.geometry.colors, 3))
        geometry.setAttribute('uv', new THREE.BufferAttribute(data.geometry.uvs, 2))
        geometry.setIndex(data.geometry.indices)

        const mesh = new THREE.Mesh(geometry, this.material)
        mesh.position.set(data.geometry.sx, data.geometry.sy, data.geometry.sz)
        mesh.name = 'mesh'
        object = new THREE.Group()
        object.add(mesh)
        const boxHelper = new THREE.BoxHelper(mesh, 0xffff00)
        boxHelper.name = 'helper'
        object.add(boxHelper)
        object.name = 'chunk'
        //@ts-ignore
        object.tilesCount = data.geometry.positions.length / 3 / 4
        if (!this.showChunkBorders) {
            boxHelper.visible = false
        }
        // should not compute it once
        if (Object.keys(data.geometry.signs).length) {
            for (const [posKey, { isWall, rotation }] of Object.entries(data.geometry.signs)) {
                const [x, y, z] = posKey.split(',')
                const signBlockEntity = this.blockEntities[posKey]
                if (!signBlockEntity) continue
                const sign = this.renderSign(new Vec3(+x, +y, +z), rotation, isWall, nbt.simplify(signBlockEntity))
                if (!sign) continue
                object.add(sign)
            }
        }
        this.sectionObjects[data.key] = object
        this.updatePosDataChunk(data.key)
        this.scene.add(object)
    }

    getSignTexture (position: Vec3, blockEntity, backSide = false) {
        const chunk = chunkPos(position)
        let textures = this.chunkTextures.get(`${chunk[0]},${chunk[1]}`)
        if (!textures) {
            textures = {}
            this.chunkTextures.set(`${chunk[0]},${chunk[1]}`, textures)
        }
        const texturekey = `${position.x},${position.y},${position.z}`
        // todo investigate bug and remove this so don't need to clean in section dirty
        if (textures[texturekey]) return textures[texturekey]

        const PrismarineChat = PrismarineChatLoader(this.version!)
        const canvas = renderSign(blockEntity, PrismarineChat)
        if (!canvas) return
        const tex = new THREE.Texture(canvas)
        tex.magFilter = THREE.NearestFilter
        tex.minFilter = THREE.NearestFilter
        tex.needsUpdate = true
        textures[texturekey] = tex
        return tex
    }

    updateCamera (pos: Vec3 | null, yaw: number, pitch: number): void {
        if (pos) {
            new tweenJs.Tween(this.camera.position).to({ x: pos.x, y: pos.y, z: pos.z }, 50).start()
        }
        this.camera.rotation.set(pitch, yaw, 0, 'ZYX')
    }

    render () {
        tweenJs.update()
        if (this.composer) {
            this.renderPass.camera = this.camera
            this.composer.render()
        } else {
            this.renderer.render(this.scene, this.camera)
        }
    }

    renderSign (position: Vec3, rotation: number, isWall: boolean, blockEntity) {
        const tex = this.getSignTexture(position, blockEntity)

        if (!tex) return

        // todo implement
        // const key = JSON.stringify({ position, rotation, isWall })
        // if (this.signsCache.has(key)) {
        //   console.log('cached', key)
        // } else {
        //   this.signsCache.set(key, tex)
        // }

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, }))
        mesh.renderOrder = 999

        // todo @sa2urami shouldnt all this be done in worker?
        mesh.scale.set(1, 7 / 16, 1)
        if (isWall) {
            mesh.position.set(0, 0, -(8 - 1.5) / 16 + 0.001)
        } else {
            // standing
            const faceEnd = 8.75
            mesh.position.set(0, 0, (faceEnd - 16 / 2) / 16 + 0.001)
        }

        const group = new THREE.Group()
        group.rotation.set(0, -THREE.MathUtils.degToRad(
            rotation * (isWall ? 90 : 45 / 2)
        ), 0)
        group.add(mesh)
        const y = isWall ? 4.5 / 16 + mesh.scale.y / 2 : (1 - (mesh.scale.y / 2))
        group.position.set(position.x + 0.5, position.y + y, position.z + 0.5)
        return group
    }

    updateLight (chunkX: number, chunkZ: number) {
        // set all sections in the chunk dirty
        for (let y = this.worldConfig.minY; y < this.worldConfig.worldHeight; y += 16) {
            this.setSectionDirty(new Vec3(chunkX, y, chunkZ))
        }
    }

    rerenderAllChunks () { // todo not clear what to do with loading chunks
        for (const key of Object.keys(this.sectionObjects)) {
            const [x, y, z] = key.split(',').map(Number)
            this.setSectionDirty(new Vec3(x, y, z))
        }
    }

    updateShowChunksBorder (value: boolean) {
        this.showChunkBorders = value
        for (const object of Object.values(this.sectionObjects)) {
            for (const child of object.children) {
                if (child.name === 'helper') {
                    child.visible = value
                }
            }
        }
    }

    resetWorld () {
        super.resetWorld()

        for (const mesh of Object.values(this.sectionObjects)) {
            this.scene.remove(mesh)
        }
    }

    getLoadedChunksRelative (pos: Vec3, includeY = false) {
        const [currentX, currentY, currentZ] = sectionPos(pos)
        return Object.fromEntries(Object.entries(this.sectionObjects).map(([key, o]) => {
            const [xRaw, yRaw, zRaw] = key.split(',').map(Number)
            const [x, y, z] = sectionPos({ x: xRaw, y: yRaw, z: zRaw })
            const setKey = includeY ? `${x - currentX},${y - currentY},${z - currentZ}` : `${x - currentX},${z - currentZ}`
            return [setKey, o]
        }))
    }

    cleanChunkTextures (x, z) {
        const textures = this.chunkTextures.get(`${Math.floor(x / 16)},${Math.floor(z / 16)}`) ?? {}
        for (const key of Object.keys(textures)) {
            textures[key].dispose()
            delete textures[key]
        }
    }

    removeColumn (x, z) {
        super.removeColumn(x, z)

        this.cleanChunkTextures(x, z)
        for (let y = this.worldConfig.minY; y < this.worldConfig.worldHeight; y += 16) {
            this.setSectionDirty(new Vec3(x, y, z), false)
            const key = `${x},${y},${z}`
            const mesh = this.sectionObjects[key]
            if (mesh) {
                this.scene.remove(mesh)
                dispose3(mesh)
            }
            delete this.sectionObjects[key]
        }
    }

    setSectionDirty (pos, value = true) {
        this.cleanChunkTextures(pos.x, pos.z) // todo don't do this!
        super.setSectionDirty(pos, value)
    }
}

// class Chunk {
//     object: THREE.Object3D;
//     geometry: THREE.BufferGeometry;
//     mesh: THREE.Mesh;
//     boxHelper: THREE.BoxHelper;
//     sectionObjects: { [key: string]: THREE.Object3D };
//     scene: THREE.Scene;
//     material: THREE.Material;
//     showChunkBorders: boolean;
//     blockEntities: any;
//     renderSign: Function;
//     updatePosDataChunk: Function;

//     constructor(data: any) {
//         this.object = this.sectionObjects[data.key];
//         if (this.object) {
//             this.scene.remove(this.object);
//             dispose3(this.object);
//             delete this.sectionObjects[data.key];
//         }

//         const chunkCoords = data.key.split(',');
//         if (!this.loadedChunks[chunkCoords[0] + ',' + chunkCoords[2]] || !data.geometry.positions.length || !this.active) return;

//         this.geometry = new THREE.BufferGeometry();
//         this.geometry.setAttribute('position', new THREE.BufferAttribute(data.geometry.positions, 3));
//         this.geometry.setAttribute('normal', new THREE.BufferAttribute(data.geometry.normals, 3));
//         this.geometry.setAttribute('color', new THREE.BufferAttribute(data.geometry.colors, 3));
//         this.geometry.setAttribute('uv', new THREE.BufferAttribute(data.geometry.uvs, 2));
//         this.geometry.setIndex(data.geometry.indices);

//         this.mesh = new THREE.Mesh(this.geometry, this.material);
//         this.mesh.position.set(data.geometry.sx, data.geometry.sy, data.geometry.sz);
//         this.mesh.name = 'mesh';
//         this.object = new THREE.Group();
//         this.object.add(this.mesh);
//         this.boxHelper = new THREE.BoxHelper(this.mesh, 0xffff00);
//         this.boxHelper.name = 'helper';
//         this.object.add(this.boxHelper);
//         this.object.name = 'chunk';
//         if (!this.showChunkBorders) {
//             this.boxHelper.visible = false;
//         }

//         if (Object.keys(data.geometry.signs).length) {
//             for (const [posKey, { isWall, rotation }] of Object.entries(data.geometry.signs)) {
//                 const [x, y, z] = posKey.split(',');
//                 const signBlockEntity = this.blockEntities[posKey];
//                 if (!signBlockEntity) continue;
//                 const sign = this.renderSign(new Vec3(+x, +y, +z), rotation, isWall, nbt.simplify(signBlockEntity));
//                 if (!sign) continue;
//                 this.object.add(sign);
//             }
//         }

//         this.sectionObjects[data.key] = this.object;
//         this.updatePosDataChunk(data.key);
//         this.scene.add(this.object);
//     }

//     dispose() {
//         this.geometry.dispose();
//         this.mesh.geometry.dispose();
//         this.boxHelper.geometry.dispose();
//         //@ts-ignore
//         this.boxHelper.material.dispose();
//     }
// }
