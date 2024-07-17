import { useRef, useEffect } from 'react'
import { showModal, hideModal } from '../globalState'
import { useIsModalActive } from './utilsApp'
import { MinimapDrawer, DrawerAdapter } from './MinimapDrawer'
import Fullmap from './Fullmap'


export default ({ adapter, fullMap }: { adapter: DrawerAdapter, fullMap?: boolean }) => {
  const fullMapOpened = useIsModalActive('full-map')
  const full = useRef(false)
  const canvasTick = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawerRef = useRef<MinimapDrawer | null>(null)

  const updateMap = () => {
    if (drawerRef.current) {
      if (!full.current && canvasTick.current % 3 === 0) {
        rotateMap()
        drawerRef.current.draw(adapter.playerPosition, undefined, full.current)
      }
      if (canvasTick.current % 300 === 0) {
        drawerRef.current.deleteOldWorldColors(adapter.playerPosition.x, adapter.playerPosition.z)
      }
    }
    canvasTick.current += 1
  }

  const toggleFullMap = () => {
    if (fullMapOpened) {
      hideModal({ reactType: 'full-map' })
      full.current = false
    } else {
      showModal({ reactType: 'full-map' })
      full.current = true
    }
  }

  const updateWarps = () => { }

  const rotateMap = () => {
    if (!drawerRef.current) return
    drawerRef.current.canvas.style.transform = `rotate(${adapter.yaw}rad)`
  }

  useEffect(() => {
    if (canvasRef.current && !drawerRef.current) {
      drawerRef.current = new MinimapDrawer(canvasRef.current, adapter)
    } else if (canvasRef.current && drawerRef.current) {
      drawerRef.current.canvas = canvasRef.current
    }
  }, [canvasRef.current, fullMapOpened, fullMap])

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

  return fullMapOpened || fullMap ? <Fullmap
    toggleFullMap={()=>{
      toggleFullMap()
    }}
    adapter={adapter}
    drawer={drawerRef.current}
    canvasRef={canvasRef}
  /> 
    : <div
      className='minimap'
      style={{
        position: 'absolute',
        right: '0px',
        top: '0px',
        padding: '5px 5px 0px 0px',
        border: '2px solid red'
      }}
      onClick={() => {
        toggleFullMap()
      }}
    >
      <canvas style={{ transition: '0.5s', transitionTimingFunction: 'ease-out' }} width={80} height={80} ref={canvasRef}></canvas>
    </div>
}

