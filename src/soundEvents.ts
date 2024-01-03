import type { Block } from 'prismarine-block'

let lastStepSound = 0

const getStepSound = (blockUnder: Block) => {
  if (!blockUnder || blockUnder.type === 0) return
  const soundsMap = window.allSoundsMap?.[bot.version]
  if (!soundsMap) return
  let soundResult = 'block.stone.step'
  for (const x of Object.keys(soundsMap).map(n => n.split(';')[1])) {
    const match = /block\.(.+)\.step/.exec(x)
    const block = match?.[1]
    if (!block) continue
    if (loadedData.blocksByName[block]?.name === blockUnder.name) {
      soundResult = x
      break
    }
  }
  return soundResult
}

export const movementHappening = () => {
  const THRESHOLD = 0.1
  const { x, z, y } = bot.player.entity.velocity
  if (Math.abs(x) < THRESHOLD && (Math.abs(z) > THRESHOLD || Math.abs(y) > THRESHOLD)) {
    // movement happening
    if (Date.now() - lastStepSound > 500) {
      const blockUnder = bot.world.getBlock(bot.entity.position.offset(0, -1, 0))
      const stepSound = getStepSound(blockUnder)
      if (stepSound) {
        playHardcodedSound(stepSound)
        lastStepSound = Date.now()
      }
    }
  }
}
