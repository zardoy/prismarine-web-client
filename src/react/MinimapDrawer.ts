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
  world?: string
  yaw: number
  setWarp: (name: string, pos: Vec3, color: string, disabled: boolean, world?: string) => void
}

export class MinimapDrawer {
  centerX: number
  centerY: number
  _mapSize: number
  radius: number
  ctx: CanvasRenderingContext2D
  _canvas: HTMLCanvasElement
  worldColors: { [key: string]: string } = {}
  lastBotPos: Vec3
  lastWarpPos: Vec3
  mapPixel: number

  constructor (
    canvas: HTMLCanvasElement,
    public adapter: DrawerAdapter
  ) {
    this.canvas = canvas
    this.adapter = adapter
  }

  get canvas () {
    return this._canvas
  }

  set canvas (canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })!
    this.ctx.imageSmoothingEnabled = false
    this.radius = Math.floor(Math.min(canvas.width, canvas.height) / 2.2)
    this._mapSize = this.radius * 2
    this.mapPixel = Math.floor(this.radius * 2 / this.mapSize)
    this.centerX = canvas.width / 2
    this.centerY = canvas.height / 2
    this._canvas = canvas
  }

  get mapSize () {
    return this._mapSize
  }

  set mapSize (mapSize: number) {
    this._mapSize = mapSize
    this.mapPixel = Math.floor(this.radius * 2 / this.mapSize)
    this.draw(this.lastBotPos)
  }

  draw (
    botPos: Vec3,
    getHighestBlockColor?: DrawerAdapter['getHighestBlockColor'],
    full?: boolean
  ) {
    this.ctx.clearRect(
      this.centerX - this.radius,
      this.centerY - this.radius,
      this.radius * 2,
      this.radius * 2
    )

    this.lastBotPos = botPos
    this.updateWorldColors(getHighestBlockColor ?? this.adapter.getHighestBlockColor, botPos.x, botPos.z, full)
    this.drawPartsOfWorld()
    this.drawWarps()
  }

  updateWorldColors (
    getHighestBlockColor: DrawerAdapter['getHighestBlockColor'],
    x: number,
    z: number,
    full?: boolean
  ) {
    const left = this.centerX - this.radius
    const top = this.centerY - this.radius

    this.ctx.reset()
    this.ctx.save()

    this.ctx.beginPath()
    if (full) {
      this.ctx.rect(this.centerX - this.radius, this.centerY - this.radius, this.radius * 2, this.radius * 2)
    } else {
      this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2, true)
    }
    this.ctx.clip()

    for (let row = 0; row < this.mapSize; row += 1) {
      for (let col = 0; col < this.mapSize; col += 1) {
        this.ctx.fillStyle = this.getHighestBlockColorCached(
          getHighestBlockColor,
          x - this.mapSize / 2 + col,
          z - this.mapSize / 2 + row
        )
        this.ctx.fillRect(
          left + this.mapPixel * col,
          top + this.mapPixel * row,
          this.mapPixel,
          this.mapPixel
        )
      }
    }

    const clippedImage = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.restore()
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.putImageData(clippedImage, 0, 0)
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

  setWarpPosOnClick (e: MouseEvent | TouchEvent, botPos: Vec3) {
    if (!e.target) return
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const z = (e.type === 'touchend' 
      ? (e as TouchEvent).changedTouches[-1].pageY 
        : (e as MouseEvent).pageY - rect.top) * this.canvas.width / rect.width
    const x = (e.type === 'touchend' 
      ? (e as TouchEvent).changedTouches[-1].pageY 
        : (e as MouseEvent).pageY - rect.left) * this.canvas.height / rect.height
    const worldX = x - this.mapSize / 2
    const worldZ = z - this.mapSize / 2

    // console.log([(botPos.x + worldX).toFixed(0), (botPos.z + worldZ).toFixed(0)])
    this.lastWarpPos = new Vec3(Math.floor(botPos.x + worldX), botPos.y, Math.floor(botPos.z + worldZ))
  }

  drawWarps () {
    for (const warp of this.adapter.warps) {
      const distance = this.getDistance(
        this.adapter.playerPosition.x, 
        this.adapter.playerPosition.z, 
        warp.x, 
        warp.z
      ) 
      if (distance > this.mapSize) continue
      const z = Math.floor((this.mapSize / 2 - this.adapter.playerPosition.z + warp.z))
      const x = Math.floor((this.mapSize / 2 - this.adapter.playerPosition.x + warp.x))
      const dz = z - this.centerX
      const dx = x - this.centerY
      const circleDist = Math.hypot(dx, dz)

      const angle = Math.atan2(dz, dx)
      const circleZ = circleDist > this.mapSize / 2 ? this.centerX + this.mapSize / 2 * Math.sin(angle) : z
      const circleX = circleDist > this.mapSize / 2 ? this.centerY + this.mapSize / 2 * Math.cos(angle) : x
      this.ctx.beginPath()
      this.ctx.arc(circleX, circleZ, circleDist > this.mapSize / 2 ? 1.5 : 2, 0, Math.PI * 2, false)
      this.ctx.strokeStyle = 'black'
      this.ctx.lineWidth = 1
      this.ctx.stroke()
      this.ctx.fillStyle = warp.disabled ? 'rgba(255, 255, 255, 0.4)' : warp.color ?? '#d3d3d3'
      this.ctx.fill()
      this.ctx.closePath()
    }
  }

  drawPartsOfWorld () {
    this.ctx.fillStyle = 'white'
    this.ctx.shadowOffsetX = 1
    this.ctx.shadowOffsetY = 1
    this.ctx.shadowColor = 'black'
    this.ctx.font = `${this.radius / 4}px serif`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.strokeStyle = 'black'
    this.ctx.lineWidth = 1

    const angle = - Math.PI / 2
    const angleS = angle + Math.PI
    const angleW = angle + Math.PI * 3 / 2
    const angleE = angle + Math.PI / 2

    this.ctx.strokeText(
      'N', 
      this.centerX + this.radius * Math.cos(angle), 
      this.centerY + this.radius * Math.sin(angle)
    )
    this.ctx.strokeText(
      'S', 
      this.centerX + this.radius * Math.cos(angleS), 
      this.centerY + this.radius * Math.sin(angleS)
    )
    this.ctx.strokeText(
      'W', 
      this.centerX + this.radius * Math.cos(angleW), 
      this.centerY + this.radius * Math.sin(angleW)
    )
    this.ctx.strokeText(
      'E', 
      this.centerX + this.radius * Math.cos(angleE), 
      this.centerY + this.radius * Math.sin(angleE)
    )
    this.ctx.fillText(
      'N', 
      this.centerX + this.radius * Math.cos(angle), 
      this.centerY + this.radius * Math.sin(angle)
    )
    this.ctx.fillText(
      'S', 
      this.centerX + this.radius * Math.cos(angleS), 
      this.centerY + this.radius * Math.sin(angleS)
    )
    this.ctx.fillText(
      'W', 
      this.centerX + this.radius * Math.cos(angleW), 
      this.centerY + this.radius * Math.sin(angleW)
    )
    this.ctx.fillText(
      'E', 
      this.centerX + this.radius * Math.cos(angleE), 
      this.centerY + this.radius * Math.sin(angleE)
    )

    this.ctx.shadowOffsetX = 0
    this.ctx.shadowOffsetY = 0
  }

  rotateMap (angle: number) {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.translate(this.centerX, this.centerY)
    this.ctx.rotate(angle)
    this.ctx.translate(-this.centerX, -this.centerY)
  }
}
