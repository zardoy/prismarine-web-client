import { Vec3 } from 'vec3'
import { Position } from 'source-map-js'
import { TypedEventEmitter } from 'contro-max/build/typedEventEmitter'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'
import BlockData from '../../prismarine-viewer/viewer/lib/moreBlockDataGenerated.json'

type BotType = Omit<import('mineflayer').Bot, 'world' | '_client'> & {
  world: Omit<import('prismarine-world').world.WorldSync, 'getBlock'> & {
    getBlock: (pos: import('vec3').Vec3) => import('prismarine-block').Block | null
  }
  _client: Omit<import('minecraft-protocol').Client, 'on'> & {
    write: typeof import('../generatedClientPackets').clientWrite
    on: typeof import('../generatedServerPackets').clientOn
  }
}

interface DrawerAdapter extends TypedEventEmitter<{
  updateBlockColor: (pos: Position) => void
  updatePlayerPosition: () => void
  updateWarps: () => void
}> {
  getHighestBlockColor: (x: number, z: number) => string
  playerPosition: Position
  warps: WorldWarp
  setWarp: (name: string, pos: Position, rotation: Position, dimension: string, color: string, disabled: boolean) => void
}

export class MinimapDrawer {
  centerX: number
  centerY: number
  mapSize: number
  radius: number
  ctx: CanvasRenderingContext2D
  worldColors: { [key: string]: string } = {}

  constructor (
    private readonly canvas: HTMLCanvasElement,
    centerX?: number,
    centerY?: number,
    radius?: number,
    mapSize?: number
  ) {
    this.canvas = canvas
    this.ctx = this.canvas.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false
    this.centerX = centerX ?? this.canvas.width / 2
    this.centerY = centerY ?? this.canvas.height / 2
    this.radius = radius ?? 25
    this.mapSize = mapSize ?? this.radius * 2
  }

  draw (bot: BotType | undefined) {
    this.ctx.clearRect(
      this.centerX - this.radius,
      this.centerY - this.radius,
      this.radius * 2,
      this.radius * 2
    )

    if (bot) {
      this.updateWorldColors(bot)
    } else {
      this.ctx.strokeStyle = 'black'
      this.ctx.beginPath()

      this.ctx.arc(this.centerX, this.centerY, this.radius, 0, 2 * Math.PI, false)

      this.ctx.fillStyle = 'white'
      this.ctx.fill()

      this.ctx.strokeStyle = '#000000'
      this.ctx.lineWidth = 1
      this.ctx.stroke()
    }
  }

  updateWorldColors (bot: BotType) {
    const left = this.centerX - this.radius
    const top = this.centerY - this.radius
    const mapPixel = Math.floor(this.radius * 2 / this.mapSize)

    this.ctx.save()

    this.ctx.beginPath()
    this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2, true)
    this.ctx.clip()

    for (let row = 0; row < this.mapSize; row += 1) {
      for (let col = 0; col < this.mapSize; col += 1) {
        this.ctx.fillStyle = this.getHighestBlockColor(
          bot,
          bot.entity.position.x - this.mapSize / 2 + row,
          bot.entity.position.z - this.mapSize / 2 + col
        )
        this.ctx.fillRect(
          left + mapPixel * col,
          top + mapPixel * row,
          mapPixel,
          mapPixel
        )
      }
    }
  }

  getHighestBlockColor (bot: BotType, x: number, z: number) {
    const roundX = Math.floor(x)
    const roundZ = Math.floor(z)
    const key = `${roundX},${roundZ}`
    if (this.worldColors[key]) {
      return this.worldColors[key]
    }
    let block = null as import('prismarine-block').Block | null
    let { height } = (bot.game as any)
    const airBlocks = new Set(['air', 'cave_air', 'void_air'])
    do {
      block = bot.world.getBlock(new Vec3(x, height, z))
      height -= 1
    } while (airBlocks.has(block?.name ?? ''))
    const color = BlockData.colors[block?.name ?? ''] ?? 'white'
    this.worldColors[key] = color
    return color
  }

  getDistance (x1: number, z1: number, x2: number, z2: number): number {
    return Math.hypot((x2 - x1), (z2 - z1))
  }

  deleteOldWorldColors (currX: number, currZ: number) {
    for (const key of Object.keys(this.worldColors)) {
      const [x, z] = key.split(',').map(Number)
      if (this.getDistance(x, z, currX, currZ) > this.radius * 5) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.worldColors[`${x},${z}`]
      }
    }
  }
}
