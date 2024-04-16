import { useMemo, useEffect, useState, useRef } from 'react'
import { getFixedFilesize } from '../downloadAndOpenFile'
import worldInteractions from '../worldInteractions'
import { options } from '../optionsStorage'

import DebugOverlay, { DebugOverlayProps } from './DebugOverlay'


const defaultPacketsCount = {
  count: 0,
  size: 0
}

export default () => {
  const received = useRef(defaultPacketsCount)
  const sent = useRef(defaultPacketsCount)
  const receivedTotal = useRef(0)
  const packetsCountByNamePerSec = useRef({
    received: {} as { [key: string]: number },
    sent: {} as { [key: string]: number }
  })
  const packetsCountByName = useRef({
    received: {} as { [key: string]: number },
    sent: {} as { [key: string]: number }
  })
  const ignoredPackets = useRef(new Set(''))
  const [packetsString, setPacketsString] = useState('')
  const [showDebug, setShowDebug] = useState(false)
  const [entity, setEntity] = useState<DebugOverlayProps['entity'] | null>(null)
  const [skyL, setSkyL] = useState(0)
  const [biomeId, setBiomeId] = useState(0)
  const [day, setDay] = useState(0)
  const [version, setVersion] = useState('')
  const [entitiesCount, setEntitiesCount] = useState(0)
  const [dimension, setDimension] = useState('')
  const [cursorBlock, setCursorBlock] = useState<typeof worldInteractions.cursorBlock>(null)
  const [rendererDevice, setRendererDevice] = useState('')

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
      'scoreboard_score'
    ],
    sent: [
      'pong',
      'position',
      'look',
      'keep_alive',
      'position_look'
    ]
  } // todo cleanup?

  const handleF3 = (e) => {
    if (e.code === 'F3') {
      setShowDebug(prev => !prev)
      e.preventDefault()
    }
  }

  const readPacket = (data, packet) => {
    const jsonString = JSON.stringify(packet)
    const { size } = new Blob([jsonString])
    receivedTotal.current += size
    received.current.size += size
    received.current.count++
    managePackets('received', packet.name, data)
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

  useMemo(() => {
    document.addEventListener('keydown', handleF3)
    const packetsUpdateInterval = setInterval(() => {
      setPacketsString(prev => `↓ ${received.current.count} (${(received.current.size / 1024).toFixed(2)} KB/s, ${getFixedFilesize(receivedTotal.current)}) ↑ ${sent.current.count}`)
      received.current = defaultPacketsCount
      sent.current = defaultPacketsCount
      packetsCountByNamePerSec.current.received = {}
      packetsCountByNamePerSec.current.sent = {}
    }, 1000)

    bot._client.on('packet', readPacket)
    // Build error: no packets 'packet_name' and 'writePacket'
    bot._client.on('packet_name' as any, (packet, data) => readPacket(data, packet)) // custom client
    bot._client.on('writePacket' as any, (packet, data) => {
      sent.current.count++
      managePackets('sent', packet, data)
    })
    bot.on('move', () => {
      setEntity(prev => { return { position: bot.entity.position, yaw: bot.entity.yaw, pitch: bot.entity.pitch }})
      setSkyL(prev => bot.world.getSkyLight(bot.entity.position))
      setBiomeId(prev => bot.world.getBiome(bot.entity.position))
      setDimension(bot.game.dimension)
    })
    bot.on('time', () => {
      setDay(bot.time.day)
    })
    bot.on('entitySpawn', () => {
      setEntitiesCount(Object.values(bot.entities).length)
    })
    bot.on('entityGone', () => {
      setEntitiesCount(Object.values(bot.entities).length)
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
    }
  }, [])

  return showDebug && <DebugOverlay
    version={version}
    entitiesCount={entitiesCount}
    dimension={dimension}
    entity={entity ?? { position: { x: 0, y:0, z:0 }, yaw: 0, pitch: 0 }}
    day={day}
    packetsString={packetsString}
    customEntries={{} as DebugOverlayProps['customEntries']}
    renderer={`${rendererDevice} powered by three.js v${THREE.REVISION}`}
    target={cursorBlock}
    biome={loadedData.biomesArray[biomeId]?.name ?? 'unknown biome'}
    skyL={skyL}
  />
}
