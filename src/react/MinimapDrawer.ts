export class MinimapDrawer {
  centerX: number
  centerY: number
  radius: number
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D 
  worldColors: string[]

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

  draw(worldColors?: string[][]) {
    this.ctx.clearRect(
      this.centerX - this.radius, 
      this.centerY - this.radius, 
      this.canvas.width, 
      this.canvas.height
    )

    if (worldColors) {
      this.updateWorldColors(worldColors)
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

  updateWorldColors(worldColors: string[][]) {
    const left = this.centerX - this.radius
    const top = this.centerY - this.radius

    this.ctx.save()

    this.ctx.beginPath()
    this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI*2, true) 
    this.ctx.clip()

    for (let row=0; row<worldColors.length; row+=1) {
      for (let col=0; col<worldColors[row].length; col+=1) {
        this.ctx.fillStyle = worldColors[row][col]
        const rectWidth = Math.floor(this.radius * 2 / worldColors[row].length)
        const rectHeight = Math.floor(this.radius * 2 / worldColors.length) 
        this.ctx.fillRect(
          left + rectWidth * col, 
          top + rectHeight * row, 
          rectWidth, 
          rectHeight
        )
      }
    }
  }

}
