import { useEffect, useState } from 'react'
import { Vec3 } from 'vec3'
import BlockData from '../../prismarine-viewer/viewer/lib/moreBlockDataGenerated.json'
import Minimap from './Minimap'


export default () => {
  const [worldColors, setWorldColors] = useState<string[][]>([])

  const getHighestBlock = (x: number, z: number) => {
    let block = null as import('prismarine-block').Block | null 
    let height = (bot.game as any).height
    const airBlocks = ['air', 'cave_air', 'void_air']
    do {
      block = bot.world.getBlock(new Vec3(x, height, z))
      height -= 1
    } while (airBlocks.includes(block?.name ?? ''))
    return height
  }  

  const drawMap = () => {
    const { colors } = BlockData
    const newColors = [] as string[][]

    const mapSize = 24
    for (let i = 0; i < mapSize; i += 1) {
      newColors[i] = [] as string[]
      for (let j = 0; j < mapSize; j += 1) {
        const x = bot.entity.position.x - mapSize / 2 + i
        const z = bot.entity.position.z - mapSize / 2 + j
        const y = getHighestBlock(x, z)
        const blockName = bot.world.getBlock(new Vec3(x, y, z))?.name
        newColors[i][j] = blockName ? colors[blockName] ?? 'white' : 'white'
      }
    }
    setWorldColors([...newColors])
  }

  useEffect(() => {
    bot.on('move', drawMap)

    return () => {
      bot.off('move', drawMap)
    }
  }, [])

  return <div>
    <Minimap worldColors={worldColors} />
  </div>
}
