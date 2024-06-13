import { useRef, useEffect } from 'react'
import { MinimapDrawer } from './MinimapDrawer'

export default ({ worldColors }: { worldColors: string[][] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null) 

  const drawMap = () => {
    const canvas = canvasRef.current!
    const minimapDrawer = new MinimapDrawer(canvas)
    minimapDrawer.draw(worldColors)
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
