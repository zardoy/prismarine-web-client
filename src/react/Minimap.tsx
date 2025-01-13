import { useRef, useEffect, useState } from 'react'
import { MinimapDrawer, DrawerAdapter } from './MinimapDrawer'
import Fullmap from './Fullmap'


export type DisplayMode = 'fullmapOnly' | 'minimapOnly'

export default (
  { adapter, showMinimap, showFullmap, singleplayer, fullMap, toggleFullMap, displayMode }:
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
  const drawerRef = useRef<MinimapDrawer | null>(null)
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 })

  const updateMap = () => {
    setPosition({ x: adapter.playerPosition.x, y: adapter.playerPosition.y, z: adapter.playerPosition.z })
    if (drawerRef.current) {
      if (!full.current) {
        rotateMap()
        drawerRef.current.draw(adapter.playerPosition)
        drawerRef.current.drawPlayerPos()
        drawerRef.current.drawWarps()
      }
      if (canvasTick.current % 300 === 0 && !fullMap) {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            drawerRef.current?.clearChunksStore()
          })
        } else {
          drawerRef.current.clearChunksStore()
        }
        canvasTick.current = 0
      }
    }
    canvasTick.current += 1
  }

  const updateWarps = () => { }

  const rotateMap = () => {
    if (!drawerRef.current) return
    drawerRef.current.canvas.style.transform = `rotate(${adapter.yaw}rad)`
    drawerRef.current.yaw = adapter.yaw
  }

  useEffect(() => {
    if (canvasRef.current && !drawerRef.current) {
      drawerRef.current = adapter.mapDrawer
      drawerRef.current.canvas = canvasRef.current
      // drawerRef.current.adapter.on('chunkReady', updateChunkOnMap)
    } else if (canvasRef.current && drawerRef.current) {
      drawerRef.current.canvas = canvasRef.current
    }
  }, [canvasRef.current])

  useEffect(() => {
    adapter.on('updateMap', updateMap)
    adapter.on('updateWaprs', updateWarps)

    return () => {
      adapter.off('updateMap', updateMap)
      adapter.off('updateWaprs', updateWarps)
    }
  }, [adapter])

  useEffect(() => {
    return () => {
      // if (drawerRef.current) drawerRef.current.adapter.off('chunkReady', updateChunkOnMap)
    }
  }, [])

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
        <canvas
          style={{
            transition: '0.5s',
            transitionTimingFunction: 'ease-out',
            borderRadius: '1000px'
          }}
          width={80}
          height={80}
          ref={canvasRef}
        />
        <div
          style={{
            fontSize: '0.5em',
            textShadow: '0.1em 0 black, 0 0.1em black, -0.1em 0 black, 0 -0.1em black, -0.1em -0.1em black, -0.1em 0.1em black, 0.1em -0.1em black, 0.1em 0.1em black'
          }}
        >
          {position.x.toFixed(2)} {position.y.toFixed(2)} {position.z.toFixed(2)}
        </div>
      </div> : null
}
