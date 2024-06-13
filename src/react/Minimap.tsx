import { useRef, useEffect } from 'react'

export default () => {
  const canvasRef = useRef<HTMLCanvasElement>(null) 

  const drawMap = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = 25

    ctx.beginPath()

    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false)

    ctx.fillStyle = 'white'
    ctx.fill()

    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  useEffect(() => {
    if (canvasRef.current) {
      drawMap()
    }
  }, [canvasRef.current])


  return <div 
    className='minimap'
    style={{
      position: 'absolute',
      right: '0px',
      top: '0px',
      padding: '5px 5px 0px 0px',
      border: '2px solid red'
    }}
  >
    <canvas width={50} height={50} ref={canvasRef}></canvas>

  </div>
}
