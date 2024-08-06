import { Vec3 } from 'vec3'
import { useRef, useEffect, useState, CSSProperties, Dispatch, SetStateAction, RefObject } from 'react'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { MinimapDrawer, DrawerAdapter } from './MinimapDrawer'
import Button from './Button'
import Input from './Input'
import './Fullmap.css'


type FullmapProps = {
  toggleFullMap: () => void,
  adapter: DrawerAdapter,
  drawer: MinimapDrawer | null,
  canvasRef: any
}

export default ({ toggleFullMap, adapter, drawer, canvasRef }: FullmapProps) => {
  const [grid, setGrid] = useState(() => new Set<string>())
  const zoomRef = useRef<ReactZoomPanPinchRef>(null)
  const redrawCell = useRef(false)
  const [lastWarpPos, setLastWarpPos] = useState({ x: 0, y: 0, z: 0 })
  const stateRef = useRef({ scale: 1, positionX: 0, positionY: 0 })
  const cells = useRef({ columns: 0, rows: 0 })
  const [isWarpInfoOpened, setIsWarpInfoOpened] = useState(false)

  const updateGrid = () => {
    const wrapperRect = zoomRef.current?.instance.wrapperComponent?.getBoundingClientRect()
    if (!wrapperRect) return
    const cellSize = 64
    const columns = Math.ceil(wrapperRect.width / (cellSize * stateRef.current.scale))
    const rows = Math.ceil(wrapperRect.height / (cellSize * stateRef.current.scale))
    cells.current.rows = rows
    cells.current.columns = columns
    const leftBorder = - Math.floor(stateRef.current.positionX / (stateRef.current.scale * cellSize)) * cellSize
    const topBorder = - Math.floor(stateRef.current.positionY / (stateRef.current.scale * cellSize)) * cellSize
    const newGrid = new Set()
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const x = leftBorder + col * cellSize
        const y = topBorder + row * cellSize
        newGrid.add(`${x},${y}`)
      }
    }
    setGrid(new Set([...grid, ...newGrid] as string[]))
  }

  useEffect(() => {
    updateGrid()
  }, [])

  return <div
    style={{
      position: 'absolute',
      isolation: 'isolate',
      inset: '0px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      zIndex: 100
    }}
  >
    { window.screen.width > 500 ? <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: '-1'
      }}
      onClick={toggleFullMap}
    ></div>
      : <Button
        icon={'close-box'}
        onClick={toggleFullMap}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 1
        }}
      /> }
    <TransformWrapper
      limitToBounds={false}
      ref={zoomRef}
      minScale={0.1}
      doubleClick={{
        disabled: false
      }}
      panning={{
        allowLeftClickPan: true,
        allowRightClickPan: false
      }}
      onTransformed={(ref, state) => {
        stateRef.current = { ...state }
      }}
      onPanningStop={() => {
        updateGrid()
      }}
      onZoomStop={() => {
        updateGrid()
      }}
    >
      <TransformComponent
        wrapperClass={'map'}
        wrapperStyle={{
          willChange: 'transform',
        }}
      >
        {[...grid].map((cellCoords) => {
          const [x, y] = cellCoords.split(',').map(Number)
          const playerChunkLeft = Math.floor(adapter.playerPosition.x / 16) * 16
          const playerChunkTop = Math.floor(adapter.playerPosition.z / 16) * 16
          const wrapperRect = zoomRef.current?.instance.wrapperComponent?.getBoundingClientRect()
          const offsetX = Math.floor((wrapperRect?.width ?? 0) / (8 * 16)) * 16
          const offsetY = Math.floor((wrapperRect?.height ?? 0) / (8 * 16)) * 16

          return <MapChunk
            key={'mapcell:' + cellCoords}
            x={x}
            y={y}
            scale={stateRef.current.scale}
            adapter={adapter}
            worldX={playerChunkLeft + x / 4 - offsetX}
            worldZ={playerChunkTop + y / 4 - offsetY}
            setIsWarpInfoOpened={setIsWarpInfoOpened}
            setLastWarpPos={setLastWarpPos}
            redraw={redrawCell.current}
          />
        })}
      </TransformComponent>
    </TransformWrapper>
    {
      isWarpInfoOpened && <WarpInfo
        adapter={adapter}
        drawer={lastWarpPos}
        setIsWarpInfoOpened={setIsWarpInfoOpened}
        afterWarpIsSet={() => {
          redrawCell.current = !redrawCell.current
        }}
      />
    }
  </div>
}


const MapChunk = (
  { x, y, scale, adapter, worldX, worldZ, setIsWarpInfoOpened, setLastWarpPos, redraw }
    :
    {
      x: number,
      y: number,
      scale: number,
      adapter: DrawerAdapter,
      worldX: number,
      worldZ: number,
      setIsWarpInfoOpened: (x: boolean) => void,
      setLastWarpPos: (obj: { x: number, y: number, z: number }) => void,
      redraw?: boolean
    }
) => {
  const containerRef = useRef(null)
  const drawerRef = useRef<MinimapDrawer | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isCanvas, setIsCanvas] = useState(false)

  const handleClick = (e: MouseEvent) => {
    console.log('click:', e)
    if ('buttons' in e && e.button !== 2) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const dpr = window.devicePixelRatio
    const factor = scale * (drawerRef.current?.mapPixel ?? 1)
    const x = (e.clientX - rect.left) / factor
    const y = (e.clientY - rect.top) / factor
    drawerRef.current?.setWarpPosOnClick(new Vec3(Math.floor(x), 0, Math.floor(y)), new Vec3(worldX, 0, worldZ))
    setLastWarpPos(drawerRef.current!.lastWarpPos)
    setIsWarpInfoOpened(true)
  }

  useEffect(() => {
    if (canvasRef.current && isCanvas && !drawerRef.current) {
      drawerRef.current = new MinimapDrawer(canvasRef.current, adapter)
      drawerRef.current.draw(new Vec3(worldX + 8, 0, worldZ + 8), undefined, true)
    } else if (canvasRef.current && isCanvas && drawerRef.current) {
      drawerRef.current.canvas = canvasRef.current
    }
  }, [canvasRef.current, isCanvas])

  useEffect(() => {
    canvasRef.current?.addEventListener('contextmenu', handleClick)

    return () => {
      canvasRef.current?.removeEventListener('contextmenu', handleClick)
    }
  }, [canvasRef.current, scale])

  useEffect(() => {
    if (drawerRef.current) {
      drawerRef.current.draw(
        new Vec3(worldX + 8, 0, worldZ + 8),
        undefined,
        true
      )
    }
  }, [drawerRef.current, redraw])

  useEffect(() => {
    const intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setIsCanvas(true)
        }
      }
    })
    intersectionObserver.observe(containerRef.current!)

    return () => {
      intersectionObserver.disconnect()
    }
  }, [])

  return <div
    ref={containerRef}
    style={{
      position: 'absolute',
      width: '64px',
      height: '64px',
      top: `${y}px`,
      left: `${x}px`,
    }}
  >
    {isCanvas && <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated'
      }}
      width={64}
      height={64}
    ></canvas>}
  </div>
}

const WarpInfo = (
  { adapter, drawer, setIsWarpInfoOpened, afterWarpIsSet }
    :
    {
      adapter: DrawerAdapter,
      drawer: { x: number, y: number, z: number },
      setIsWarpInfoOpened: Dispatch<SetStateAction<boolean>>,
      afterWarpIsSet?: () => void
    }
) => {
  const [warp, setWarp] = useState<WorldWarp>({
    name: '',
    x: drawer?.x ?? 100,
    y: drawer?.y ?? 100,
    z: drawer?.z ?? 100,
    color: '#d3d3d3',
    disabled: false,
    world: adapter.world
  })

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
      fontSize: '0.8em',
      transform: 'scale(3)'
    }}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '40%',
        minWidth: '100px',
        maxWidth: '150px',
        padding: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        border: '2px solid black'
      }}
    >
      <div style={fieldCont}>
        <div>
          Name:
        </div>
        <Input
          onChange={(e) => {
            if (!e.target) return
            setWarp(prev => { return { ...prev, name: e.target.value } })
          }}
        />
      </div>
      <div style={fieldCont}>
        <div>
          X:
        </div>
        <Input
          rootStyles={posInputStyle}
          defaultValue={drawer?.x ?? 100}
          onChange={(e) => {
            if (!e.target) return
            setWarp(prev => { return { ...prev, x: Number(e.target.value) } })
          }}
        />
        <div>
          Z:
        </div>
        <Input
          rootStyles={posInputStyle}
          defaultValue={drawer?.z ?? 100}
          onChange={(e) => {
            if (!e.target) return
            setWarp(prev => { return { ...prev, z: Number(e.target.value) } })
          }}
        />
      </div>
      <div style={fieldCont}>
        <div>Color:</div>
        <Input
          placeholder={'#232323 or rgb(0, 0, 0)'}
          onChange={(e) => {
            if (!e.target) return
            setWarp(prev => { return { ...prev, color: e.target.value } })
          }}
        />
      </div>
      <div style={fieldCont} >
        <div>Disabled:</div>
        <input
          type={'checkbox'}
          onChange={(e) => {
            if (!e.target) return
            setWarp(prev => { return { ...prev, disabled: e.target.checked } })
          }}
        />
      </div>
      <div style={fieldCont}>
        <Button
          onClick={() => {
            adapter.setWarp(
              warp.name,
              new Vec3(warp.x, warp.y, warp.z),
              warp.color ?? '#d3d3d3',
              warp.disabled ?? false,
              warp.world ?? 'overworld'
            )
            console.log(adapter.warps)
            setIsWarpInfoOpened(false)
            afterWarpIsSet?.()
          }}
        >Add</Button>
        <Button
          onClick={() => {
            setIsWarpInfoOpened(false)
          }}
        >Cancel</Button>
      </div>
    </div>
  </div>
}
