import { proxy, subscribe } from 'valtio'
import { Vec3 } from 'vec3'
import { watchUnloadForCleanup } from './gameUnload'

// todo rename botUtils then

export const diggingState = proxy({
  isDigging: false,
  diggingHand: 'right' as 'right' | 'left',
  block: null as import('prismarine-block').Block | null,
})

const blockUpdateListener = (_, newBlock: import('prismarine-block').Block | null) => {
  // https://github.com/PrismarineJS/mineflayer/blob/f85a381c2c67558a5d96363eb68b5092fac6cdd2/lib/plugins/digging.js#L162

  if (newBlock?.type === 0) {
    stopDigging()
  }
}

export const digGlobally = (block: import('prismarine-block').Block, diggingFace: number, hand: 'right' | 'left') => {
  console.log(block.name)
  bot._client.write('block_dig', {
    status: 0, // start digging
    location: block.position,
    face: diggingFace // default face is 1 (top)
  })
  diggingState.isDigging = true
  diggingState.diggingHand = hand
  diggingState.block = block
  bot.on(`blockUpdate:${block.position as any}` as 'blockUpdate', blockUpdateListener)
}
window.diggingState = diggingState

export const stopDigging = () => {
  if (!diggingState.isDigging) return
  const { position } = diggingState.block!
  bot._client.write('block_dig', {
    status: 2, // cancel digging
    location: position,
    face: 1 // hard coded to 1 (top)
  })
  customEvents.emit('blockDig' as any, diggingState.block!)
  diggingState.isDigging = false
  diggingState.block = null
  bot.off(`blockUpdate:${position as any}` as 'blockUpdate', blockUpdateListener)
}

let armSwingInterval: NodeJS.Timeout

subscribe(diggingState, () => {
  if (diggingState.isDigging) {
    armSwingInterval = setInterval(() => {
      bot.swingArm(diggingState.diggingHand)
    }, 350)
    watchUnloadForCleanup(() => {
      clearInterval(armSwingInterval)
    })
  } else {
    clearInterval(armSwingInterval)
  }
})
