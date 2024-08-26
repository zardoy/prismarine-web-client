import { getRenamedData } from 'flying-squid/dist/blockRenames'
import collisionShapesInit from '../generated/latestBlockCollisionsShapes.json'

// defining globally to be used in loaded data, not sure of better workaround
window.globalGetCollisionShapes = (version) => {
  // todo use the same in resourcepack
  const versionFrom = collisionShapesInit.version
  const renamedBlocks = getRenamedData('blocks', Object.keys(collisionShapesInit.blocks), versionFrom, version)
  const collisionShapes = {
    ...collisionShapesInit,
    blocks: Object.fromEntries(Object.entries(collisionShapesInit.blocks).map(([, shape], i) => [renamedBlocks[i], shape]))
  }
  return collisionShapes
}
