import { useRef, useEffect, useState } from 'react'
import { contro } from '../controls'
import { MinimapDrawer } from './MinimapDrawer'

export default () => {
  const [fullMapOpened, setFullMapOpened] = useState(false)
  const canvasTick = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawerRef = useRef<MinimapDrawer | null>(null)

  function updateMap () {
    if (drawerRef.current && canvasTick.current % 2 === 0) {
      drawerRef.current.draw(bot)
      if (canvasTick.current % 300 === 0) {
        drawerRef.current.deleteOldWorldColors(bot.entity.position.x, bot.entity.position.z)
      }
    }
    canvasTick.current += 1
  }

  const toggleFullMap = ({ command }) => {
    if (command === 'ui.toggleMap') setFullMapOpened(prev => !prev)
  }


  useEffect(() => {
    if (canvasRef.current && !drawerRef.current) {
      drawerRef.current = new MinimapDrawer(canvasRef.current)
    } else if (canvasRef.current && drawerRef.current) {
      drawerRef.current.canvas = canvasRef.current
    }
  }, [canvasRef.current, fullMapOpened])

  useEffect(() => {
    bot.on('move', updateMap)

    contro.on('trigger', toggleFullMap)

    return () => {
      bot.off('move', updateMap)
      contro.off('trigger', toggleFullMap)
    }
  }, [])

  return fullMapOpened ? <div 
    style={{
      position: 'absolute',
      inset: '0px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      border: '2px solid red',
      backgroundColor: 'rgba(0, 0, 0, 0.4)'
    }}
  >
    <canvas 
      style={{
        width: '35%',
      }}
      width={150} 
      height={150} 
      ref={canvasRef}
    ></canvas>

  </div> : <div
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
