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
  const warpsAndPartsCanvasRef = useRef<HTMLCanvasElement>(null)
  const warpsDrawerRef = useRef<MinimapDrawer | null>(null)
  const drawerRef = useRef<MinimapDrawer | null>(null)

  const updateMap = () => {
    if (drawerRef.current) {
      if (!full.current && canvasTick.current % 3 === 0) {
        rotateMap()
        drawerRef.current.clearRect()
        drawerRef.current.updateWorldColors(adapter.getHighestBlockColor, adapter.playerPosition.x, adapter.playerPosition.z, false)
        // drawerRef.current.draw(adapter.playerPosition, undefined, full.current)
      }
      if (canvasTick.current % 300 === 0) {
        drawerRef.current.deleteOldWorldColors(adapter.playerPosition.x, adapter.playerPosition.z)
      }
    }
    if (warpsDrawerRef.current) {
      if (!full.current && canvasTick.current % 3 === 0) {
        rotateMap()
        warpsDrawerRef.current.clearRect()
        warpsDrawerRef.current.drawPartsOfWorld()
        warpsDrawerRef.current.drawWarps()
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
    if (!warpsDrawerRef.current) return
    warpsDrawerRef.current.canvas.style.transform = `rotate(${adapter.yaw}rad)`
  }

  useEffect(() => {
    if (canvasRef.current && !drawerRef.current) {
      drawerRef.current = new MinimapDrawer(canvasRef.current, adapter)
    } else if (canvasRef.current && drawerRef.current) {
      drawerRef.current.canvas = canvasRef.current
    }
  }, [canvasRef.current, fullMapOpened, fullMap])

  useEffect(() => {
    if (warpsAndPartsCanvasRef.current && !warpsDrawerRef.current) {
      warpsDrawerRef.current = new MinimapDrawer(warpsAndPartsCanvasRef.current, adapter)
    } else if (warpsAndPartsCanvasRef.current && warpsDrawerRef.current) {
      warpsDrawerRef.current.canvas = warpsAndPartsCanvasRef.current
    }
  }, [warpsAndPartsCanvasRef.current])

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
      }}
      onClick={() => {
        toggleFullMap()
      }}
    >
      <canvas style={{
        transition: '0.5s',
        transitionTimingFunction: 'ease-out',
        borderRadius: '100px'
      }}
      width={80}
      height={80}
      ref={canvasRef}
      ></canvas>
      <canvas
        style={{
          transition: '0.5s',
          transitionTimingFunction: 'ease-out',
          position: 'absolute',
          left: '0px'
        }}
        width={80}
        height={80}
        ref={warpsAndPartsCanvasRef}
      ></canvas>
    </div>
}

