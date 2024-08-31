import { getRenamedData } from 'flying-squid/dist/blockRenames'
import outputInteractionShapesJson from './interactionShapesGenerated.json'
import './getCollisionShapes'

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
