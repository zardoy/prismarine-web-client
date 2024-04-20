import { subscribeKey } from 'valtio/utils'
import { Vec3 } from 'vec3'
import { versionToNumber } from 'prismarine-viewer/viewer/prepare/utils'
import { loadScript } from 'prismarine-viewer/viewer/lib/utils'
import type { Block } from 'prismarine-block'
import { miscUiState } from './globalState'
import { options } from './optionsStorage'
import { loadOrPlaySound } from './basicSounds'
import { showNotification } from './react/NotificationProvider'

const globalObject = window as {
  allSoundsMap?: Record<string, Record<string, string>>,
  allSoundsVersionedMap?: Record<string, string[]>,
}

subscribeKey(miscUiState, 'gameLoaded', async () => {
  if (!miscUiState.gameLoaded) return
  const soundsLegacyMap = window.allSoundsVersionedMap as Record<string, string[]>
  const { allSoundsMap } = globalObject
  const allSoundsMeta = window.allSoundsMeta as { format: string, baseUrl: string }
  if (!allSoundsMap) {
    return
  }

  // todo also use major versioned hardcoded sounds
  const soundsMap = allSoundsMap[bot.version]

  if (!soundsMap || !miscUiState.gameLoaded || !soundsMap) {
    return
  }

  const soundsPerId = Object.fromEntries(Object.entries(soundsMap).map(([id, sound]) => [+id.split(';')[0], sound]))
  const soundsPerName = Object.fromEntries(Object.entries(soundsMap).map(([id, sound]) => [id.split(';')[1], sound]))
  const soundIdToName = Object.fromEntries(Object.entries(soundsMap).map(([id, sound]) => [+id.split(';')[0], id.split(';')[1]]))

  const playGeneralSound = async (soundId: string, soundString: string | undefined, position?: Vec3, volume = 1, pitch?: number) => {
    if (!soundString) {
      console.warn('Unknown sound received from server to play', soundId)
      return
    }
    if (!options.volume) return
    const parts = soundString.split(';')
    const soundVolume = +parts[0]!
    const soundName = parts[1]!
    // console.log('pitch', pitch)
    const versionedSound = getVersionedSound(bot.version, soundName, Object.entries(soundsLegacyMap))
    // todo test versionedSound
    const url = allSoundsMeta.baseUrl.replace(/\/$/, '') + (versionedSound ? `/${versionedSound}` : '') + '/minecraft/sounds/' + soundName + '.' + allSoundsMeta.format
    const soundKey = soundIdToName[+soundId] ?? soundId
    const isMuted = options.mutedSounds.includes(soundKey) || options.volume === 0
    if (position) {
      if (!isMuted) {
        viewer.playSound(position, url, soundVolume * Math.max(Math.min(volume, 1), 0) * (options.volume / 100))
      }
      if (getDistance(bot.entity.position, position) < 4 * 16) {
        lastPlayedSounds.lastServerPlayed[soundKey] ??= { count: 0, last: 0 }
        lastPlayedSounds.lastServerPlayed[soundKey].count++
        lastPlayedSounds.lastServerPlayed[soundKey].last = Date.now()
      }
    } else {
      if (!isMuted) {
        await loadOrPlaySound(url, volume)
      }
      lastPlayedSounds.lastClientPlayed.push(soundKey)
      if (lastPlayedSounds.lastClientPlayed.length > 10) {
        lastPlayedSounds.lastClientPlayed.shift()
      }
    }
  }
  const playHardcodedSound = async (soundId: string, position?: Vec3, volume = 1, pitch?: number) => {
    const sound = soundsPerName[soundId]
    await playGeneralSound(soundId, sound, position, volume, pitch)
  }
  bot.on('soundEffectHeard', async (soundId, position, volume, pitch) => {
    console.debug('soundEffectHeard', soundId, volume)
    await playHardcodedSound(soundId, position, volume, pitch)
  })
  bot.on('hardcodedSoundEffectHeard', async (soundId, soundCategory, position, volume, pitch) => {
    const sound = soundsPerId[soundId]
    await playGeneralSound(soundId.toString(), sound, position, volume, pitch)
  })
  bot.on('entityHurt', async (entity) => {
    if (entity.id === bot.entity.id) {
      await playHardcodedSound('entity.player.hurt')
    }
  })

  const useBlockSound = (blockName: string, category: string, fallback: string) => {
    blockName = {
      // todo somehow generated, not full
      grass_block: 'grass',
      tall_grass: 'grass',
      fern: 'grass',
      large_fern: 'grass',
      dead_bush: 'grass',
      seagrass: 'grass',
      tall_seagrass: 'grass',
      kelp: 'grass',
      kelp_plant: 'grass',
      sugar_cane: 'grass',
      bamboo: 'grass',
      vine: 'grass',
      nether_sprouts: 'grass',
      nether_wart: 'grass',
      twisting_vines: 'grass',
      weeping_vines: 'grass',

      cobblestone: 'stone',
      stone_bricks: 'stone',
      mossy_stone_bricks: 'stone',
      cracked_stone_bricks: 'stone',
      chiseled_stone_bricks: 'stone',
      stone_brick_slab: 'stone',
      stone_brick_stairs: 'stone',
      stone_brick_wall: 'stone',
      polished_granite: 'stone',
    }[blockName] ?? blockName
    const key = 'block.' + blockName + '.' + category
    return soundsPerName[key] ? key : fallback
  }

  const getStepSound = (blockUnder: Block) => {
    // const soundsMap = globalObject.allSoundsMap?.[bot.version]
    // if (!soundsMap) return
    // let soundResult = 'block.stone.step'
    // for (const x of Object.keys(soundsMap).map(n => n.split(';')[1])) {
    //   const match = /block\.(.+)\.step/.exec(x)
    //   const block = match?.[1]
    //   if (!block) continue
    //   if (loadedData.blocksByName[block]?.name === blockUnder.name) {
    //     soundResult = x
    //     break
    //   }
    // }
    return useBlockSound(blockUnder.name, 'step', 'block.stone.step')
  }

  let lastStepSound = 0
  const movementHappening = async () => {
    if (!bot.player) return // no info yet
    const VELOCITY_THRESHOLD = 0.1
    const { x, z, y } = bot.player.entity.velocity
    if (bot.entity.onGround && Math.abs(x) < VELOCITY_THRESHOLD && (Math.abs(z) > VELOCITY_THRESHOLD || Math.abs(y) > VELOCITY_THRESHOLD)) {
      // movement happening
      if (Date.now() - lastStepSound > 300) {
        const blockUnder = bot.world.getBlock(bot.entity.position.offset(0, -1, 0))
        const stepSound = getStepSound(blockUnder)
        if (stepSound) {
          await playHardcodedSound(stepSound, undefined, 0.6)// todo not sure why 0.6
          lastStepSound = Date.now()
        }
      }
    }
  }

  const playBlockBreak = async (blockName: string, position?: Vec3) => {
    const sound = useBlockSound(blockName, 'break', 'block.stone.break')

    await playHardcodedSound(sound, position, 0.6, 1)
  }

  const registerEvents = () => {
    bot.on('move', () => {
      void movementHappening()
    })
    bot._client.on('world_event', async ({ effectId, location, data, global: disablePosVolume }) => {
      const position = disablePosVolume ? undefined : new Vec3(location.x, location.y, location.z)
      if (effectId === 2001) {
        // break event
        const block = loadedData.blocksByStateId[data]
        await playBlockBreak(block.name, position)
      }
      // these produce glass break sound
      if (effectId === 2002 || effectId === 2003 || effectId === 2007) {
        await playHardcodedSound('block.glass.break', position, 1, 1)
      }
      if (effectId === 1004) {
        // firework shoot
        await playHardcodedSound('entity.firework_rocket.launch', position, 1, 1)
      }
      if (effectId === 1006 || effectId === 1007 || effectId === 1014) {
        // wooden door open/close
        await playHardcodedSound('block.wooden_door.open', position, 1, 1)
      }
      if (effectId === 1002) {
        // dispenser shoot
        await playHardcodedSound('block.dispenser.dispense', position, 1, 1)
      }
      if (effectId === 1024) {
        // wither shoot
        await playHardcodedSound('entity.wither.shoot', position, 1, 1)
      }
      if (effectId === 1031) {
        // anvil land
        await playHardcodedSound('block.anvil.land', position, 1, 1)
      }
      if (effectId === 1010) {
        console.log('play record', data)
      }
      // todo add support for all current world events
    })
    let diggingBlock: Block | null = null
    customEvents.on('digStart', () => {
      diggingBlock = bot.blockAtCursor(5)
    })
    bot.on('diggingCompleted', async () => {
      if (diggingBlock) {
        await playBlockBreak(diggingBlock.name, diggingBlock.position)
      }
    })
  }

  registerEvents()

  // 1.20+ soundEffectHeard is broken atm
  // bot._client.on('packet', (data, { name }, buffer) => {
  //   if (name === 'sound_effect') {
  //     console.log(data, buffer)
  //   }
  // })
})

// todo
// const music = {
//   activated: false,
//   playing: '',
//   activate () {
//     const gameMusic = Object.entries(globalObject.allSoundsMap?.[bot.version] ?? {}).find(([id, sound]) => sound.includes('music.game'))
//     if (!gameMusic) return
//     const soundPath = gameMusic[0].split(';')[1]
//     const next = () => {}
//   }
// }

export const earlyCheck = () => {
  const { allSoundsMap } = globalObject
  if (!allSoundsMap) return

  // todo also use major versioned hardcoded sounds
  const soundsMap = allSoundsMap[bot.version]

  if (!soundsMap) {
    console.warn('No sounds map for version', bot.version, 'supported versions are', Object.keys(allSoundsMap).join(', '))
    showNotification('Warning', 'No sounds map for version ' + bot.version)
  }
}

const getVersionedSound = (version: string, item: string, itemsMapSortedEntries: Array<[string, string[]]>) => {
  const verNumber = versionToNumber(version)
  for (const [itemsVer, items] of itemsMapSortedEntries) {
    // 1.18 < 1.18.1
    // 1.13 < 1.13.2
    if (items.includes(item) && verNumber <= versionToNumber(itemsVer)) {
      return itemsVer
    }
  }
}

export const downloadSoundsIfNeeded = async () => {
  if (!globalObject.allSoundsMap) {
    try {
      await loadScript('./sounds.js')
    } catch (err) {
      console.warn('Sounds map was not generated. Sounds will not be played.')
    }
  }
}

export const lastPlayedSounds = {
  lastClientPlayed: [] as string[],
  lastServerPlayed: {} as Record<string, { count: number, last: number }>,
}

const getDistance = (pos1: Vec3, pos2: Vec3) => {
  return Math.hypot((pos1.x - pos2.x), (pos1.y - pos2.y), (pos1.z - pos2.z))
}
