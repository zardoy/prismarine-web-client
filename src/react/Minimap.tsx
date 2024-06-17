import { useRef, useEffect } from 'react'
import { MinimapDrawer } from './MinimapDrawer'

export default () => {
  const canvasTick = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null) 
  const drawerRef = useRef<MinimapDrawer | null>(null)

  function updateMap () {
    if (drawerRef.current && canvasTick.current % 10 === 0) {
      drawerRef.current.draw(bot)
      if (canvasTick.current % 300 === 0) {
        drawerRef.current.clearCache(bot.entity.position.x, bot.entity.position.z)
      }
    }
    canvasTick.current += 1
  }

  useEffect(() => {
    if (canvasRef.current) {
      drawerRef.current = new MinimapDrawer(canvasRef.current)
    }
  }, [canvasRef.current])

  useEffect(() => {
    bot.on('move', updateMap)

    return () => {
      bot.off('move', updateMap)
    }
  }, [])


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
