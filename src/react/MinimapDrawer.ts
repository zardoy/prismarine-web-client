
export class MinimapDrawer {
  centerX: number
  centerY: number
  radius: number
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D 

  constructor (
    canvas: HTMLCanvasElement,
    centerX?: number,
    centerY?: number,
    radius?: number,
  ) {
    this.canvas = canvas
    this.ctx = this.canvas.getContext('2d')!
    this.centerX = centerX ?? this.canvas.width / 2
    this.centerY = centerY ?? this.canvas.height / 2
    this.radius = radius ?? 25
  }

  draw() {
    this.ctx.clearRect(
      this.centerX - this.radius, 
      this.centerY - this.radius, 
      this.canvas.width, 
      this.canvas.height
    )
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
