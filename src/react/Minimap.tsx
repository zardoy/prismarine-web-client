import { useRef, useEffect } from 'react'
import { MinimapDrawer } from './MinimapDrawer'

export default () => {
  const canvasTick = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawerRef = useRef<MinimapDrawer | null>(null)

  function updateMap () {
    if (drawerRef.current && canvasTick.current % 10 === 0) {
      console.log(drawerRef.current.worldColors)
      drawerRef.current.draw(bot)
      if (canvasTick.current % 300 === 0) {
        drawerRef.current.deleteOldWorldColors(bot.entity.position.x, bot.entity.position.z)
        console.log(drawerRef.current.worldColors)
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
    console.log('set update')
    bot.on('move', updateMap)

    return () => {
      console.log('delete update')
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
