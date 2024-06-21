import { useRef, useEffect, useState } from 'react'
import { contro } from '../controls'
import { MinimapDrawer } from './MinimapDrawer'
import { DrawerAdapter } from './MinimapDrawer' 

export default ({ adapter }: { adapter: DrawerAdapter | null }) => {
  const [fullMapOpened, setFullMapOpened] = useState(false)
  const canvasTick = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawerRef = useRef<MinimapDrawer | null>(null)

  function updateMap () {
    if (!adapter) return
    if (drawerRef.current && canvasTick.current % 2 === 0) {
      drawerRef.current.draw(adapter.getHighestBlockColor, adapter.playerPosition.x, adapter.playerPosition.z)
      if (canvasTick.current % 300 === 0) {
        drawerRef.current.deleteOldWorldColors(adapter.playerPosition.x, adapter.playerPosition.z)
      }
    }
    canvasTick.current += 1
  }

  const toggleFullMap = () => {
    setFullMapOpened(prev => !prev)
  }


  useEffect(() => {
    if (canvasRef.current && !drawerRef.current) {
      drawerRef.current = new MinimapDrawer(canvasRef.current)
    } else if (canvasRef.current && drawerRef.current) {
      drawerRef.current.canvas = canvasRef.current
    }
  }, [canvasRef.current, fullMapOpened])

  useEffect(() => {
    if (adapter) {
      adapter.on('updateMap', updateMap)
      adapter.on('toggleFullMap', toggleFullMap)
    }

    return () => {
      if (adapter) {
        adapter.off('updateMap', updateMap)
        adapter.off('toggleFullMap', toggleFullMap)
      }
    }
  }, [adapter])

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
