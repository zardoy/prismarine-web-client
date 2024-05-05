import { setBlockStatesData, getSectionGeometry } from '../models'
import { World as MesherWorld } from '../world'
import ChunkLoader, { PCChunk } from 'prismarine-chunk'
import { Vec3 } from 'vec3'
import MinecraftData from 'minecraft-data'

export const setup = (version, initialBlocks: [number[], string][]) => {
    const mcData = MinecraftData(version)
    const blockStates = require(`../../../../public/blocksStates/${version}.json`)
    const mesherWorld = new MesherWorld(version)
    const Chunk = ChunkLoader(version)
    const chunk1 = new Chunk(undefined as any)

    const pos = new Vec3(2, 5, 2)
    for (const [addPos, name] of initialBlocks) {
        chunk1.setBlockStateId(pos.offset(addPos[0], addPos[1], addPos[2]), mcData.blocksByName[name].defaultState!)
    }

    const getGeometry = () => {
        const sectionGeometry = getSectionGeometry(0, 0, 0, mesherWorld)
        const centerFaces = sectionGeometry.tiles[`${pos.x},${pos.y},${pos.z}`]?.faces.length ?? 0
        const totalTiles = Object.values(sectionGeometry.tiles).reduce((acc, val: any) => acc + val.faces.length, 0)
        const centerTileNeighbors = Object.entries(sectionGeometry.tiles).reduce((acc, [key, val]: any) => {
            return acc + val.faces.filter((face: any) => face.neighbor === `${pos.x},${pos.y},${pos.z}`).length
        }, 0)
        return {
            centerFaces,
            totalTiles,
            centerTileNeighbors,
            faces: sectionGeometry.tiles[`${pos.x},${pos.y},${pos.z}`]?.faces ?? []
        }
    }

    setBlockStatesData(blockStates, true)
    const reload = () => {
        mesherWorld.removeColumn(0, 0)
        mesherWorld.addColumn(0, 0, chunk1.toJson())
    }
    reload()

    return {
        mesherWorld,
        getGeometry,
        pos,
        mcData,
        reload,
        chunk: chunk1 as PCChunk
    }
}

// surround it
const addPositions = [
    // [[0, 0, 0], 'diamond_block'],
    [[1, 0, 0], 'stone'],
    [[-1, 0, 0], 'stone'],
    [[0, 1, 0], 'stone'],
    [[0, -1, 0], 'stone'],
    [[0, 0, 1], 'stone'],
    [[0, 0, -1], 'stone'],
]
