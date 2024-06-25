import { Vec3 } from 'vec3'
import { TypedEventEmitter } from 'contro-max/build/typedEventEmitter'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'

type BotType = Omit<import('mineflayer').Bot, 'world' | '_client'> & {
  world: Omit<import('prismarine-world').world.WorldSync, 'getBlock'> & {
    getBlock: (pos: import('vec3').Vec3) => import('prismarine-block').Block | null
  }
  _client: Omit<import('minecraft-protocol').Client, 'on'> & {
    write: typeof import('../generatedClientPackets').clientWrite
    on: typeof import('../generatedServerPackets').clientOn
  }
}

export type MapUpdates = {
  updateBlockColor: (pos: Vec3) => void
  updatePlayerPosition: () => void
  updateWarps: () => void
}

export interface DrawerAdapter extends TypedEventEmitter<MapUpdates> {
  getHighestBlockColor: (x: number, z: number) => string
  playerPosition: Vec3
  warps: WorldWarp[]
  setWarp: (name: string, pos: Vec3, dimension: string, color: string, disabled: boolean) => void
}

export class MinimapDrawer {
  centerX: number
  centerY: number
  mapSize: number
  radius: number
  ctx: CanvasRenderingContext2D
  _canvas: HTMLCanvasElement
  worldColors: { [key: string]: string } = {}

  constructor (
    canvas: HTMLCanvasElement,
  ) {
    this.canvas = canvas
  }

  get canvas () {
    return this._canvas
  }

  set canvas (canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false
    this.radius = Math.min(canvas.width, canvas.height) / 2
    this.mapSize = this.radius * 2
    this.centerX = canvas.width / 2
    this.centerY = canvas.height / 2
    this._canvas = canvas
  }

  draw (
    getHighestBlockColor: DrawerAdapter['getHighestBlockColor'],
    x: number,
    z: number
  ) {
    this.ctx.clearRect(
      this.centerX - this.radius,
      this.centerY - this.radius,
      this.radius * 2,
      this.radius * 2
    )

    this.updateWorldColors(getHighestBlockColor, x, z)
  }

  updateWorldColors (
    getHighestBlockColor: DrawerAdapter['getHighestBlockColor'],
    x: number,
    z: number
  ) {
    const left = this.centerX - this.radius
    const top = this.centerY - this.radius
    const mapPixel = Math.floor(this.radius * 2 / this.mapSize)

    this.ctx.save()

    this.ctx.beginPath()
    this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2, true)
    this.ctx.clip()

    for (let row = 0; row < this.mapSize; row += 1) {
      for (let col = 0; col < this.mapSize; col += 1) {
        this.ctx.fillStyle = this.getHighestBlockColorCached(
          getHighestBlockColor,
          x - this.mapSize / 2 + row,
          z - this.mapSize / 2 + col
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

  getHighestBlockColorCached (
    getHighestBlockColor: DrawerAdapter['getHighestBlockColor'], 
    x: number, 
    z: number
  ) {
    const roundX = Math.floor(x)
    const roundZ = Math.floor(z)
    const key = `${roundX},${roundZ}`
    if (this.worldColors[key]) {
      return this.worldColors[key]
    }
    const color = getHighestBlockColor(x, z)
    if (color !== 'white') this.worldColors[key] = color
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

  mouseToWorldPos(x: number, z: number, botPos: Vec3) {
    const worldX = x - this.radius
    const worldZ = z - this.radius

    return [botPos.x - worldX, botPos.z - worldZ]
  }
}
