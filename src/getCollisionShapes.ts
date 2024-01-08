import { adoptBlockOrItemNamesFromLatest } from 'flying-squid/src/blockRenames'
import collisionShapesInit from '../generated/latestBlockCollisionsShapes.json'
import outputInteractionShapesJson from './interactionShapesGenerated.json'

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

export default () => {
  customEvents.on('gameLoaded', () => {
    // todo also remap block states (e.g. redstone)!
    const renamedBlocksInteraction = adoptBlockOrItemNamesFromLatest('blocks', bot.version, Object.keys(outputInteractionShapesJson))
    const interactionShapes = {
      ...outputInteractionShapesJson,
      ...Object.fromEntries(Object.entries(outputInteractionShapesJson).map(([block, shape], i) => [renamedBlocksInteraction[i], shape]))
    }
    // todo make earlier
    window.interactionShapes = interactionShapes
  })
}
