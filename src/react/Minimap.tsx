import { useRef, useEffect, useState, CSSProperties, Dispatch, SetStateAction } from 'react'
import { showModal, hideModal } from '../globalState'
import { useIsModalActive } from './utilsApp'
import { MinimapDrawer, DrawerAdapter } from './MinimapDrawer'
import Input from './Input'
import Button from './Button'
 

export default ({ adapter, fullMap }: { adapter: DrawerAdapter, fullMap?: boolean }) => {
  const fullMapOpened = useIsModalActive('full-map')
  const [isWarpInfoOpened, setIsWarpInfoOpened] = useState(false)
  const canvasTick = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawerRef = useRef<MinimapDrawer | null>(null)

  function updateMap () {
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
    drawerRef.current?.addWarpOnClick(e, adapter.playerPosition)
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
  }, [canvasRef.current, fullMapOpened, fullMap])

  useEffect(() => {
    if ((fullMapOpened || fullMap) && canvasRef.current) {
      canvasRef.current.addEventListener('click', handleClickOnMap)
    } else if (!fullMapOpened || !fullMap) {
      setIsWarpInfoOpened(false)
    }

    return () => {
      canvasRef.current?.removeEventListener('click', handleClickOnMap)
    }
  }, [fullMapOpened, fullMap])

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

  return fullMapOpened || fullMap ? <div 
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
    {isWarpInfoOpened && <WarpInfo adapter={adapter} drawer={drawerRef.current} setIsWarpInfoOpened={setIsWarpInfoOpened} />}
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

const WarpInfo = (
  { adapter, drawer, setIsWarpInfoOpened }
  : 
  { adapter: DrawerAdapter, drawer: MinimapDrawer | null, setIsWarpInfoOpened: Dispatch<SetStateAction<boolean>> }
) => {
  const posInputStyle: CSSProperties = {
    flexGrow: '1',
  }
  const fieldCont: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  }

  return <div
    style={{
      position: 'absolute',
      inset: '0px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      fontSize: '0.8em'
    }}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '40%',
        minWidth: '300px',
        maxWidth: '400px',
        padding: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        border: '2px solid black'
      }}
    >
      <div style={fieldCont}>
        <div>
          Name:
        </div>
        <Input />
      </div>
      <div style={fieldCont}>
        <div>
          X:
        </div>
        <Input 
          rootStyles={posInputStyle} 
          defaultValue={drawer?.lastBotPos.x ?? 100} />
        <div>
          Y:
        </div>
        <Input 
          rootStyles={posInputStyle} 
          defaultValue={drawer?.lastBotPos.y ?? 100} />
        <div>
          Z:
        </div>
        <Input 
          rootStyles={posInputStyle} 
          defaultValue={drawer?.lastBotPos.z ?? 100} />
      </div>
      <div style={fieldCont}>
        <div>Color:</div>
        <Input placeholder={'#232323 or rgb(0, 0, 0)'} />
      </div>
      <div style={fieldCont} >
        <div>Disabled:</div>
        <input type={'checkbox'} />
      </div>
      <div style={fieldCont}>
        <Button>Add</Button>
        <Button
          onClick={() => {
            setIsWarpInfoOpened(false)
          }}
        >Cancel</Button>
      </div>
    </div>
  </div>
}
