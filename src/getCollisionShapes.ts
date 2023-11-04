import { adoptBlockOrItemNamesFromLatest } from 'flying-squid/src/blockRenames'
import collisionShapesInit from '../generated/latestBlockCollisionsShapes.json'

// defining globally to be used in loaded data, not sure of better workaround
window.globalGetCollisionShapes = (version) => {
  // todo use the same in resourcepack
  const renamedBlocks = adoptBlockOrItemNamesFromLatest('blocks', version, Object.keys(collisionShapesInit.blocks))
  const collisionShapes = {
    ...collisionShapesInit,
    blocks: Object.fromEntries(Object.entries(collisionShapesInit.blocks).map(([, shape], i) => [renamedBlocks[i], shape]))
  }
  return collisionShapes
}
