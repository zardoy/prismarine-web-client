import { adoptBlockOrItemNamesFromLatest } from 'flying-squid/dist/blockRenames'
import collisionShapesInit from '../generated/latestBlockCollisionsShapes.json'
import outputInteractionShapesJson from './interactionShapesGenerated.json'
import supportedVersions from './supportedVersions.mjs'

// defining globally to be used in loaded data, not sure of better workaround
window.globalGetCollisionShapes = (version) => {
  // todo use the same in resourcepack
  const renamedBlocks = adoptBlockOrItemNamesFromLatest('blocks', Object.keys(collisionShapesInit.blocks), supportedVersions.at(-1)!, version)
  const collisionShapes = {
    ...collisionShapesInit,
    blocks: Object.fromEntries(Object.entries(collisionShapesInit.blocks).map(([, shape], i) => [renamedBlocks[i], shape]))
  }
  return collisionShapes
}

export default () => {
  customEvents.on('gameLoaded', () => {
    // todo also remap block states (e.g. redstone)!
    const renamedBlocksInteraction = adoptBlockOrItemNamesFromLatest('blocks', Object.keys(outputInteractionShapesJson), '1.20.2', bot.version)
    const interactionShapes = {
      ...outputInteractionShapesJson,
      ...Object.fromEntries(Object.entries(outputInteractionShapesJson).map(([block, shape], i) => [renamedBlocksInteraction[i], shape]))
    }
    // todo make earlier
    window.interactionShapes = interactionShapes
  })
}
