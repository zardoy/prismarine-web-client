import { useRef, useEffect, useState } from 'react'
import { showModal, hideModal } from '../globalState'
import { useIsModalActive } from './utilsApp'
import { MinimapDrawer, DrawerAdapter } from './MinimapDrawer'
import Input from './Input'
 

export default ({ adapter }: { adapter: DrawerAdapter }) => {
  const fullMapOpened = useIsModalActive('full-map')
  const [isWarpInfoOpened, setIsWarpInfoOpened] = useState(false)
  const canvasTick = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawerRef = useRef<MinimapDrawer | null>(null)

  function updateMap () {
    if (!adapter) return
    if (drawerRef.current && canvasTick.current % 2 === 0) {
      drawerRef.current.draw(adapter.playerPosition)
      if (canvasTick.current % 300 === 0) {
        drawerRef.current.deleteOldWorldColors(adapter.playerPosition.x, adapter.playerPosition.z)
      }
    }
    canvasTick.current += 1
  }

  const toggleFullMap = () => {
    if (fullMapOpened) {
      hideModal({ reactType: 'full-map' })
    } else {
      showModal({ reactType: 'full-map' })
    }
  }

  const handleClickOnMap = (e: MouseEvent) => {
    drawerRef.current?.addWarpOnClick(e, bot.entity.position)
    setIsWarpInfoOpened(true)
  }

  const updateWarps = () => {

  }

  useEffect(() => {
    if (canvasRef.current && !drawerRef.current) {
      drawerRef.current = new MinimapDrawer(canvasRef.current, adapter)
    } else if (canvasRef.current && drawerRef.current) {
      drawerRef.current.canvas = canvasRef.current
    }
  }, [canvasRef.current, fullMapOpened])

  useEffect(() => {
    if (fullMapOpened && canvasRef.current) {
      canvasRef.current.addEventListener('click', handleClickOnMap)
    } else if (!fullMapOpened) {
      setIsWarpInfoOpened(false)
    }

    return () => {
      canvasRef.current?.removeEventListener('click', handleClickOnMap)
    }
  }, [fullMapOpened])

  useEffect(() => {
    adapter.on('updateMap', updateMap)
    adapter.on('toggleFullMap', toggleFullMap)
    adapter.on('updateWaprs', updateWarps)

    return () => {
      adapter.off('updateMap', updateMap)
      adapter.off('toggleFullMap', toggleFullMap)
      adapter.off('updateWaprs', updateWarps)
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
    {isWarpInfoOpened && <WarpInfo adapter={adapter} />}

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

const WarpInfo = ({ adapter }: { adapter: DrawerAdapter }) => {

  return <div
    style={{
      position: 'absolute',
      inset: '0px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      maxWidth: '70%'
    }}
  >
    <div>
      Name: <Input />
    </div>
    <div style={{
      display: 'flex'
    }}>
      <div>X: <Input value={adapter.playerPosition.x} /></div> 
      <div>Y: <Input value={adapter.playerPosition.y} /></div> 
      <div>Z: <Input value={adapter.playerPosition.z} /></div> 
    </div>

  </div>
}
