import { useRef, useEffect } from 'react'
import { MinimapDrawer, DrawerAdapter } from './MinimapDrawer'
import Fullmap from './Fullmap'


export default (
  { adapter, fullMap, toggleFullMap }
  :
  { adapter: DrawerAdapter, fullMap?: boolean, toggleFullMap?: ({ command }: { command: string }) => void }
) => {
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
  }, [canvasRef.current, fullMap])

  useEffect(() => {
    if (warpsAndPartsCanvasRef.current && !warpsDrawerRef.current) {
      warpsDrawerRef.current = new MinimapDrawer(warpsAndPartsCanvasRef.current, adapter)
    } else if (warpsAndPartsCanvasRef.current && warpsDrawerRef.current) {
      warpsDrawerRef.current.canvas = warpsAndPartsCanvasRef.current
    }
  }, [warpsAndPartsCanvasRef.current])

  useEffect(() => {
    adapter.on('updateMap', updateMap)
    adapter.on('updateWaprs', updateWarps)

    return () => {
      adapter.off('updateMap', updateMap)
      adapter.off('updateWaprs', updateWarps)
    }
  }, [adapter])

  return fullMap ? <Fullmap
    toggleFullMap={()=>{
      toggleFullMap?.({ command: 'ui.toggleMap' })
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
        toggleFullMap?.({ command: 'ui.toggleMap' })
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

