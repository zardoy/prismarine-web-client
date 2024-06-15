import { getRenamedData } from 'flying-squid/dist/blockRenames'
import collisionShapesInit from '../generated/latestBlockCollisionsShapes.json'
import outputInteractionShapesJson from './interactionShapesGenerated.json'

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

export default () => {
  customEvents.on('gameLoaded', () => {
    // todo also remap block states (e.g. redstone)!
    const renamedBlocksInteraction = getRenamedData('blocks', Object.keys(outputInteractionShapesJson), '1.20.2', bot.version)
    const interactionShapes = {
      ...outputInteractionShapesJson,
      ...Object.fromEntries(Object.entries(outputInteractionShapesJson).map(([block, shape], i) => [renamedBlocksInteraction[i], shape]))
    }
    interactionShapes[''] = interactionShapes['air']
    // todo make earlier
    window.interactionShapes = interactionShapes
  })
}
