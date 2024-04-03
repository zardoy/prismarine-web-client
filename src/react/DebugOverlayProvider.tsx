import { useMemo, useEffect, useState, useRef } from 'react'
import { getFixedFilesize } from '../downloadAndOpenFile'
import { options } from '../optionsStorage'
import DebugOverlay from './DebugOverlay'


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
    if (packet.fullBuffer) {
      const size = packet.fullBuffer.byteLength
      receivedTotal.current += size
      received.current.size += size
    }
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
    // bot._client.on('packet_name', (packet, data) => readPacket(data, packet)) // custom client
    // bot._client.on('writePacket', (packet, data) => {
    //   sent.count++
    //   managePackets('sent', packet, data)
    // })

    return () => {
      document.removeEventListener('keydown', handleF3)
      clearInterval(packetsUpdateInterval)
    }
  }, [])

  return <DebugOverlay 
    show={showDebug}
    version={'1.0.0'}
    entities={{} as any}
    game={{
      dimension: 'dimension'
    }}
    entity={{
      position: {
        x: 0,
        y: 0,
        z: 0
      },
      yaw: 10,
      pitch: 10
    }}
    time={{
      day: 1
    }}
    packetsString={packetsString}
    customEntries={{
      'event1': 'nothing'
    }}
    rendererDevice={'device'}
    loadData={{
      biomesArray: [
        { name: 'plains' }
      ]
    }}
    threejs_revision={'threejs'}
    biomeId={0}
    skyL={'sky'}
  />
}
