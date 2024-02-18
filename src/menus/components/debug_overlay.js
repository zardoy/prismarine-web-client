const { LitElement, html, css } = require('lit')
const { subscribeKey } = require('valtio/utils')
const { miscUiState } = require('../../globalState')
const { options } = require('../../optionsStorage')
const { getFixedFilesize } = require('../../downloadAndOpenFile')

class DebugOverlay extends LitElement {
  static get styles () {
    return css`
      .debug-left-side,
      .debug-right-side {
        padding-left: calc(env(safe-area-inset-left) / 2);
        padding-right: calc(env(safe-area-inset-right) / 2);
        position: absolute;
        display: flex;
        flex-direction: column;
        z-index: 40;
        pointer-events: none;
      }

      .debug-left-side {
        top: 1px;
        left: 1px;
      }

      .debug-right-side {
        top: 5px;
        right: 1px;
        /* limit renderer long text width */
        width: 50%;
      }

      p {
        display: block;
        color: white;
        font-size: 10px;
        width: fit-content;
        line-height: 9px;
        margin: 0;
        padding: 0;
        padding-bottom: 1px;
        background: rgba(110, 110, 110, 0.5);
      }

      .debug-right-side p {
        margin-left: auto;
      }

      .empty {
        display: block;
        height: 9px;
      }
    `
  }

  static get properties () {
    return {
      showOverlay: { type: Boolean },
      cursorBlock: { type: Object },
      rendererDevice: { type: String },
      bot: { type: Object },
      customEntries: { type: Object },
      packetsString: { type: String }
    }
  }

  constructor () {
    super()
    this.showOverlay = false
    this.customEntries = {}
    this.packetsString = ''
  }

  firstUpdated () {
    document.addEventListener('keydown', e => {
      if (e.code === 'F3') {
        this.showOverlay = !this.showOverlay
        e.preventDefault()
      }
    })

    let receivedTotal = 0
    let received = {
      count: 0,
      size: 0
    }
    let sent = {
      count: 0,
      size: 0
    }
    const packetsCountByNamePerSec = {
      received: {},
      sent: {}
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
    const ignoredPackets = new Set('')
    Object.defineProperty(window, 'debugTopPackets', {
      get () {
        return Object.fromEntries(Object.entries(packetsCountByName).map(([s, packets]) => [s, Object.fromEntries(Object.entries(packets).sort(([, n1], [, n2]) => {
          return n2 - n1
        }))]))
      }
    })
    setInterval(() => {
      this.packetsString = `↓ ${received.count} (${(received.size / 1024).toFixed(2)} KB/s, ${getFixedFilesize(receivedTotal)}) ↑ ${sent.count}`
      received = {
        count: 0,
        size: 0
      }
      sent = {
        count: 0,
        size: 0
      }
      packetsCountByNamePerSec.received = {}
      packetsCountByNamePerSec.sent = {}
    }, 1000)
    const packetsCountByName = {
      received: {},
      sent: {}
    }

    const managePackets = (type, name, data) => {
      packetsCountByName[type][name] ??= 0
      packetsCountByName[type][name]++
      if (options.debugLogNotFrequentPackets && !ignoredPackets.has(name) && !hardcodedListOfDebugPacketsToIgnore[type].includes(name)) {
        packetsCountByNamePerSec[type][name] ??= 0
        packetsCountByNamePerSec[type][name]++
        if (packetsCountByNamePerSec[type][name] > 5 || packetsCountByName[type][name] > 100) { // todo think of tracking the count within 10s
          console.info(`[packet ${name} was ${type} too frequent] Ignoring...`)
          ignoredPackets.add(name)
        } else {
          console.info(`[packet ${type}] ${name}`, /* ${JSON.stringify(data, null, 2)}` */ data)
        }
      }
    }

    subscribeKey(miscUiState, 'gameLoaded', () => {
      if (!miscUiState.gameLoaded) return
      packetsCountByName.received = {}
      packetsCountByName.sent = {}
      const readPacket = (data, { name }, _buf, fullBuffer) => {
        if (fullBuffer) {
          const size = fullBuffer.byteLength
          receivedTotal += size
          received.size += size
        }
        received.count++
        managePackets('received', name, data)
      }
      bot._client.on('packet', readPacket)
      bot._client.on('packet_name', (name, data) => readPacket(data, { name })) // custom client
      bot._client.on('writePacket', (name, data) => {
        sent.count++
        managePackets('sent', name, data)
      })
    })
  }

  updated (changedProperties) {
    if (changedProperties.has('bot')) {
      this.bot.on('move', () => {
        this.requestUpdate()
      })
      this.bot.on('time', () => {
        this.requestUpdate()
      })
      this.bot.on('entitySpawn', () => {
        this.requestUpdate()
      })
      this.bot.on('entityGone', () => {
        this.requestUpdate()
      })
    }
  }

  render () {
    if (!this.showOverlay) {
      return html``
    }

    const target = this.cursorBlock

    const pos = this.bot.entity.position
    const rot = [this.bot.entity.yaw, this.bot.entity.pitch]

    const viewDegToMinecraft = (yaw) => yaw % 360 - 180 * (yaw < 0 ? -1 : 1)

    const quadsDescription = [
      'north (towards negative Z)',
      'east (towards positive X)',
      'south (towards positive Z)',
      'west (towards negative X)'
    ]

    const minecraftYaw = viewDegToMinecraft(rot[0] * -180 / Math.PI)
    const minecraftQuad = Math.floor(((minecraftYaw + 180) / 90 + 0.5) % 4)

    const renderProp = (name, value) => {
      return html`<p>${name}: ${typeof value === 'boolean' ? html`<span style="color: ${value ? 'lightgreen' : 'red'}">${value}</span>` : value}</p>`
    }

    const skyL = this.bot.world.getSkyLight(this.bot.entity.position)
    const biomeId = this.bot.world.getBiome(this.bot.entity.position)

    return html`
      <div class="debug-left-side">
        <p>Prismarine Web Client (${this.bot.version})</p>
        <p>E: ${Object.values(this.bot.entities).length}</p>
        <p>${this.bot.game.dimension}</p>
        <div class="empty"></div>
        <p>XYZ: ${pos.x.toFixed(3)} / ${pos.y.toFixed(3)} / ${pos.z.toFixed(3)}</p>
        <p>Chunk: ${Math.floor(pos.x % 16)} ~ ${Math.floor(pos.z % 16)} in ${Math.floor(pos.x / 16)} ~ ${Math.floor(pos.z / 16)}</p>
        <p>Packets: ${this.packetsString}</p>
        <p>Facing (viewer): ${rot[0].toFixed(3)} ${rot[1].toFixed(3)}</p>
        <p>Facing (minecraft): ${quadsDescription[minecraftQuad]} (${minecraftYaw.toFixed(1)} ${(rot[1] * -180 / Math.PI).toFixed(1)})</p>
        <p>Light: ${skyL} (${skyL} sky)</p>
        <!-- todo fix biome -->
        <p>Biome: minecraft:${window.loadedData.biomesArray[biomeId]?.name ?? 'unknown biome'}</p>
        <p>Day: ${this.bot.time.day}</p>
        <div class="empty"></div>
        ${Object.entries(this.customEntries).map(([name, value]) => html`<p>${name}: ${value}</p>`)}
      </div>

      <div class="debug-right-side">
        <p>Renderer: ${this.rendererDevice} powered by three.js r${global.THREE.REVISION}</p>
        <div class="empty"></div>
        ${target ? html`<p>${target.name}</p>${Object.entries(target.getProperties()).map(([n, p], idx, arr) => renderProp(n, p, arr[idx + 1]))}` : ''}
        ${target ? html`<p>Looking at: ${target.position.x} ${target.position.y} ${target.position.z}</p>` : ''}
      </div>
    `
  }
}

window.customElements.define('pmui-debug-overlay', DebugOverlay)
