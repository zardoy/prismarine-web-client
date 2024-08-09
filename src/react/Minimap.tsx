import { useRef, useEffect, useState } from 'react'
import { MinimapDrawer, DrawerAdapter } from './MinimapDrawer'
import Fullmap from './Fullmap'


export type DisplayMode = 'fullmapOnly' | 'minimapOnly'

export default (
  { adapter, showMinimap, showFullmap, singleplayer, fullMap, toggleFullMap, displayMode }
  :
  {
    adapter: DrawerAdapter,
    showMinimap: string,
    showFullmap: string,
    singleplayer: boolean,
    fullMap?: boolean,
    toggleFullMap?: ({ command }: { command: string }) => void
    displayMode?: DisplayMode
  }
) => {
  const full = useRef(false)
  const canvasTick = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const warpsAndPartsCanvasRef = useRef<HTMLCanvasElement>(null)
  const warpsDrawerRef = useRef<MinimapDrawer | null>(null)
  const drawerRef = useRef<MinimapDrawer | null>(null)
  const [position, setPosition] = useState({ x: 0, z: 0 })

  const updateMap = () => {
    setPosition({ x: adapter.playerPosition.x, z: adapter.playerPosition.z })
    if (drawerRef.current) {
      if (!full.current && canvasTick.current % 3 === 0) {
        rotateMap()
        drawerRef.current.clearRect()
        void drawerRef.current.updateWorldColors(adapter.getHighestBlockColor, adapter.playerPosition.x, adapter.playerPosition.z, false)
      }
      if (canvasTick.current % 300 === 0) {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            drawerRef.current?.deleteOldWorldColors(adapter.playerPosition.x, adapter.playerPosition.z)
          })
        } else {
          drawerRef.current.deleteOldWorldColors(adapter.playerPosition.x, adapter.playerPosition.z)
        }
        canvasTick.current = 0
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
  }, [canvasRef.current])

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

  return fullMap && displayMode !== 'minimapOnly' && (showFullmap === 'singleplayer' && singleplayer || showFullmap === 'always')
    ? <Fullmap
      toggleFullMap={() => {
        toggleFullMap?.({ command: 'ui.toggleMap' })
      }}
      adapter={adapter}
      drawer={drawerRef.current}
      canvasRef={canvasRef}
    />
    : displayMode !== 'fullmapOnly' && (showMinimap === 'singleplayer' && singleplayer || showMinimap === 'always')
      ? <div
        className='minimap'
        style={{
          position: 'absolute',
          right: '0px',
          top: '0px',
          padding: '5px 5px 0px 0px',
          textAlign: 'center',
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
        <div
          style={{
            fontSize: '0.5em'
          }}
        >
          {position.x.toFixed(2)} {position.z.toFixed(2)}
        </div>
      </div> : null
}
