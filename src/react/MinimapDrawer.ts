import { Vec3 } from 'vec3'
import { TypedEventEmitter } from 'contro-max/build/typedEventEmitter'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'

export type MapUpdates = {
  updateBlockColor: (pos: Vec3) => void
  updatePlayerPosition: () => void
  updateWarps: () => void
}

export interface DrawerAdapter extends TypedEventEmitter<MapUpdates> {
  getHighestBlockColor: (x: number, z: number) => Promise<string>
  playerPosition: Vec3
  warps: WorldWarp[]
  world?: string
  yaw: number
  setWarp: (name: string, pos: Vec3, color: string, disabled: boolean, world?: string, remove?: boolean) => void
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
  isMapUpdating: boolean

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
    if (full) {
      this.radius = Math.floor(Math.min(this.canvas.width, this.canvas.height) / 2)
      this._mapSize = 16
      this.mapPixel = Math.floor(this.radius * 2 / this.mapSize)
    }
    this.ctx.clearRect(
      this.centerX - this.canvas.width,
      this.centerY - this.canvas.height,
      this.canvas.width,
      this.canvas.height
    )

    this.lastBotPos = botPos
    void this.updateWorldColors(getHighestBlockColor ?? this.adapter.getHighestBlockColor, botPos.x, botPos.z, full)
    if (!full) this.drawPartsOfWorld()
    this.drawWarps(botPos, full)
  }

  clearRect (full?: boolean) {
    if (full) {
      this.radius = Math.floor(Math.min(this.canvas.width, this.canvas.height) / 2)
      this._mapSize = this.radius * 2
      this.mapPixel = Math.floor(this.radius * 2 / this.mapSize)
    }
    this.ctx.clearRect(
      this.centerX - this.canvas.width,
      this.centerY - this.canvas.height,
      this.canvas.width * 2,
      this.canvas.height * 2
    )
  }

  async updateWorldColors (
    getHighestBlockColor: DrawerAdapter['getHighestBlockColor'],
    x: number,
    z: number,
    full?: boolean
  ) {
    if (this.isMapUpdating) return
    this.isMapUpdating = true
    const left = this.centerX - this.radius
    const top = this.centerY - this.radius

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
        const roundX = Math.floor(x - this.mapSize / 2 + col)
        const roundZ = Math.floor(z - this.mapSize / 2 + row)
        const key = `${roundX},${roundZ}`
        const fillColor = this.worldColors[key] ?? await this.adapter.getHighestBlockColor(roundX, roundZ)
        if (fillColor !== 'rgb(200, 200, 200)' && !this.worldColors[key]) this.worldColors[key] = fillColor
        this.ctx.fillStyle = fillColor
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
    this.isMapUpdating = false
  }

  async getHighestBlockColorCached (
    getHighestBlockColor: DrawerAdapter['getHighestBlockColor'],
    x: number,
    z: number
  ) {
    return new Promise<string>((resolve) => {
      const color = getHighestBlockColor(x, z)
      resolve(color)
    })
  }

  getDistance (x1: number, z1: number, x2: number, z2: number): number {
    return Math.hypot((x2 - x1), (z2 - z1))
  }

  deleteOldWorldColors (currX: number, currZ: number) {
    for (const key of Object.keys(this.worldColors)) {
      const [x, z] = key.split(',').map(Number)
      if (this.getDistance(x, z, currX, currZ) > this.radius * 5) {

        delete this.worldColors[`${x},${z}`]
      }
    }
  }

  setWarpPosOnClick (mousePos: Vec3, botPos: Vec3) {
    // if (!e.target) return
    // const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    // const clickX = (e as MouseEvent).clientX - rect.left
    // const clickY = (e as MouseEvent).clientY - rect.top
    // const centerX = rect.width / 2
    // const centerY = rect.height / 2
    // const z = ((e.type === 'touchend'
    //   ? (e as TouchEvent).changedTouches[-1].pageY
    //   : clickY - centerY))
    // const x = ((e.type === 'touchend'
    //   ? (e as TouchEvent).changedTouches[-1].pageX
    //   : clickX - centerX))
    // const worldX = x
    // const worldZ = z

    // console.log([(botPos.x + worldX).toFixed(0), (botPos.z + worldZ).toFixed(0)])
    this.lastWarpPos = new Vec3(Math.floor(botPos.x + mousePos.x), 0, Math.floor(botPos.z + mousePos.z))
  }

  drawWarps (centerPos?: Vec3, full?: boolean) {
    for (const warp of this.adapter.warps) {
      if (!full) {
        const distance = this.getDistance(
          centerPos?.x ?? this.adapter.playerPosition.x,
          centerPos?.z ?? this.adapter.playerPosition.z,
          warp.x,
          warp.z
        )
        if (distance > this.mapSize) continue
      }
      const offset = full ? 0 : this.radius * 0.2
      const z = Math.floor(
        (this.mapSize / 2 - (centerPos?.z ?? this.adapter.playerPosition.z) + warp.z) * this.mapPixel
      ) + offset
      const x = Math.floor(
        (this.mapSize / 2 - (centerPos?.x ?? this.adapter.playerPosition.x) + warp.x) * this.mapPixel
      ) + offset
      const dz = z - this.centerX
      const dx = x - this.centerY
      const circleDist = Math.hypot(dx, dz)

      const angle = Math.atan2(dz, dx)
      const circleZ = circleDist > this.mapSize / 2 && !full ?
        this.centerX + this.mapSize / 2 * Math.sin(angle)
        : z
      const circleX = circleDist > this.mapSize / 2 && !full ?
        this.centerY + this.mapSize / 2 * Math.cos(angle)
        : x
      this.ctx.beginPath()
      this.ctx.arc(
        circleX,
        circleZ,
        circleDist > this.mapSize / 2 && !full
          ? this.mapPixel * 1.5
          : full ? this.mapPixel : this.mapPixel * 2,
        0,
        Math.PI * 2,
        false
      )
      this.ctx.strokeStyle = 'black'
      this.ctx.lineWidth = this.mapPixel
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
