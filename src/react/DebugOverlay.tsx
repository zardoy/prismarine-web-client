import { useEffect, useRef, useMemo, useState } from 'react'
import { getFixedFilesize } from '../downloadAndOpenFile'
import { options } from '../optionsStorage'
import worldInteractions from '../worldInteractions'
import styles from './DebugOverlay.module.css'

export default () => {
  const received = useRef({ ...defaultPacketsCount })
  const sent = useRef({ ...defaultPacketsCount })
  const customEntries = useRef({} as any)
  const receivedTotal = useRef(0)
  const packetsCountByNamePerSec = useRef({
    received: {} as { [key: string]: number },
    sent: {} as { [key: string]: number }
  })
  const packetsCountByName = useRef({
    received: {} as { [key: string]: number },
    sent: {} as { [key: string]: number }
  })
  const ignoredPackets = useRef(new Set([] as any[]))
  const [packetsString, setPacketsString] = useState('')
  const [showDebug, setShowDebug] = useState(false)
  const [pos, setPos] = useState<{ x: number, y: number, z: number }>({ x: 0, y: 0, z: 0 })
  const [skyL, setSkyL] = useState(0)
  const [blockL, setBlockL] = useState(0)
  const [biomeId, setBiomeId] = useState(0)
  const [day, setDay] = useState(0)
  const [entitiesCount, setEntitiesCount] = useState(0)
  const [dimension, setDimension] = useState('')
  const [cursorBlock, setCursorBlock] = useState<typeof worldInteractions.cursorBlock>(null)
  const [rendererDevice, setRendererDevice] = useState('')
  const minecraftYaw = useRef(0)
  const minecraftQuad = useRef(0)

  const quadsDescription = [
    'north (towards negative Z)',
    'east (towards positive X)',
    'south (towards positive Z)',
    'west (towards negative X)'
  ]

  const viewDegToMinecraft = (yaw) => yaw % 360 - 180 * (yaw < 0 ? -1 : 1)

  const handleF3 = (e) => {
    if (e.code === 'F3') {
      setShowDebug(prev => !prev)
      e.preventDefault()
    }
  }

  const readPacket = (data, { name }, _buf, fullBuffer) => {
    if (fullBuffer) {
      const size = fullBuffer.byteLength
      receivedTotal.current += size
      received.current.size += size
    }
    received.current.count++
    managePackets('received', name, data)
  }

  const managePackets = (type, name, data) => {
    packetsCountByName.current[type][name] ??= 0
    packetsCountByName.current[type][name]++
    if (options.debugLogNotFrequentPackets && !ignoredPackets.current.has(name) && !hardcodedListOfDebugPacketsToIgnore[type].includes(name)) {
      packetsCountByNamePerSec.current[type][name] ??= 0
      packetsCountByNamePerSec.current[type][name]++
      if (packetsCountByNamePerSec.current[type][name] > 5 || packetsCountByName.current[type][name] > 100) { // todo think of tracking the count within 10s
        console.info(`[packet ${name} was ${type} too frequent] Ignoring...`)
        ignoredPackets.current.add(name)
      } else {
        console.info(`[packet ${type}] ${name}`, /* ${JSON.stringify(data, null, 2)}` */ data)
      }
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleF3)
    const packetsUpdateInterval = setInterval(() => {
      setPacketsString(`↓ ${received.current.count} (${(received.current.size / 1024).toFixed(2)} KB/s, ${getFixedFilesize(receivedTotal.current)}) ↑ ${sent.current.count}`)
      received.current = { ...defaultPacketsCount }
      sent.current = { ...defaultPacketsCount }
      packetsCountByNamePerSec.current.received = {}
      packetsCountByNamePerSec.current.sent = {}
    }, 1000)

    const freqUpdateInterval = setInterval(() => {
      setPos({ ...bot.entity.position })
      setSkyL(bot.world.getSkyLight(bot.entity.position))
      setBlockL(bot.world.getBlockLight(bot.entity.position))
      setBiomeId(bot.world.getBiome(bot.entity.position))
      setDimension(bot.game.dimension)
      setDay(bot.time.day)
      setCursorBlock(worldInteractions.cursorBlock)
      setEntitiesCount(Object.values(bot.entities).length)
    }, 100)

    // @ts-expect-error
    bot._client.on('packet', readPacket)
    // @ts-expect-error
    bot._client.on('packet_name' as any, (name, data) => readPacket(data, { name })) // custom client
    bot._client.on('writePacket' as any, (name, data) => {
      sent.current.count++
      managePackets('sent', name, data)
    })

    try {
      const gl = window.renderer.getContext()
      setRendererDevice(gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')!.UNMASKED_RENDERER_WEBGL))
    } catch (err) {
      console.warn(err)
    }

    return () => {
      document.removeEventListener('keydown', handleF3)
      clearInterval(packetsUpdateInterval)
      clearInterval(freqUpdateInterval)
    }
  }, [])

  useEffect(() => {
    minecraftYaw.current = viewDegToMinecraft(bot.entity.yaw * -180 / Math.PI)
    minecraftQuad.current = Math.floor(((minecraftYaw.current + 180) / 90 + 0.5) % 4)
  }, [bot.entity.yaw])

  if (!showDebug) return null

  return <>
    <div className={styles['debug-left-side']}>
      <p>Prismarine Web Client ({bot.version})</p>
      <p>E: {entitiesCount}</p>
      <p>{dimension}</p>
      <div className={styles.empty}></div>
      <p>XYZ: {pos.x.toFixed(3)} / {pos.y.toFixed(3)} / {pos.z.toFixed(3)}</p>
      <p>Chunk: {Math.floor(pos.x % 16)} ~ {Math.floor(pos.z % 16)} in {Math.floor(pos.x / 16)} ~ {Math.floor(pos.z / 16)}</p>
      <p>Packets: {packetsString}</p>
      <p>Facing (viewer): {bot.entity.yaw.toFixed(3)} {bot.entity.pitch.toFixed(3)}</p>
      <p>Facing (minecraft): {quadsDescription[minecraftQuad.current]} ({minecraftYaw.current.toFixed(1)} {(bot.entity.pitch * -180 / Math.PI).toFixed(1)})</p>
      <p>Light: {blockL} ({skyL} sky)</p>

      <p>Biome: minecraft:{loadedData.biomesArray[biomeId]?.name ?? 'unknown biome'}</p>
      <p>Day: {day}</p>
      <div className={styles.empty}></div>
      {Object.entries(customEntries.current).map(([name, value]) => <p key={name}>{name}: {value}</p>)}
    </div>

    <div className={styles['debug-right-side']}>
      <p>Renderer: {rendererDevice} powered by three.js r{THREE.REVISION}</p>
      <div className={styles.empty}></div>
      {cursorBlock ? (<>
        <p>{cursorBlock.name}</p>
        {
          Object.entries(cursorBlock.getProperties()).map(
            ([name, value], idx, arr) => {
              return <p key={name}>
                {name}: {
                  typeof value === 'boolean' ? (
                    <span style={{ color: value ? 'lightgreen' : 'red' }}>{value}</span>
                  ) : value
                }
              </p>
            }
          )
        }
      </>)
        : ''}
      {cursorBlock ? (
        <p>Looking at: {cursorBlock.position.x} {cursorBlock.position.y} {cursorBlock.position.z}</p>
      ) : ''}
    </div>
  </>
}

const hardcodedListOfDebugPacketsToIgnore = {
  received: [
    'entity_velocity',
    'sound_effect',
    'rel_entity_move',
    'entity_head_rotation',
    'entity_metadata',
    'entity_move_look',
    'teams',
    'entity_teleport',
    'entity_look',
    'ping',
    'entity_update_attributes',
    'player_info',
    'update_time',
    'animation',
    'entity_equipment',
    'entity_destroy',
    'named_entity_spawn',
    'update_light',
    'set_slot',
    'block_break_animation',
    'map_chunk',
    'spawn_entity',
    'world_particles',
    'keep_alive',
    'chat',
    'playerlist_header',
    'scoreboard_objective',
    'scoreboard_score',
    'entity_status'
  ],
  sent: [
    'pong',
    'position',
    'look',
    'keep_alive',
    'position_look'
  ]
}

const defaultPacketsCount = {
  count: 0,
  size: 0
}
