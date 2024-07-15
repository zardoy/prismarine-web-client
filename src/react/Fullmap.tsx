import { Vec3 } from 'vec3'
import { useRef, useEffect, useState, CSSProperties, Dispatch, SetStateAction } from 'react'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { MinimapDrawer, DrawerAdapter } from './MinimapDrawer'
import Button from './Button'
import Input from './Input'


type FullmapProps = {
  toggleFullMap: () => void,
  adapter: DrawerAdapter,
  drawer: MinimapDrawer | null,
  canvasRef: any
}

export default ({ toggleFullMap, adapter, drawer, canvasRef }: FullmapProps) => {
  const [grid, setGrid] = useState(() => new Set<string>())
  const zoomRef = useRef<ReactZoomPanPinchRef>(null)
  const isDragging = useRef(false)
  const oldCanvases = useRef<HTMLCanvasElement[]>([])
  const canvasesCont = useRef<HTMLDivElement>(null)
  const stateRef = useRef({ scale: 1, positionX: 0, positionY: 0 })
  const cells = useRef({ columns: 0, rows: 0 })
  const [isWarpInfoOpened, setIsWarpInfoOpened] = useState(false)

  const updateGrid = () => {
    const wrapperRect = zoomRef.current?.instance.wrapperComponent?.getBoundingClientRect()
    if (!wrapperRect) return
    const cellSize = 32
    const columns = Math.ceil(wrapperRect.width / (cellSize * stateRef.current.scale))
    const rows = Math.ceil(wrapperRect.height / (cellSize * stateRef.current.scale))
    cells.current.rows = rows
    cells.current.columns = columns
    const leftBorder = - Math.floor(stateRef.current.positionX / (stateRef.current.scale * cellSize)) * cellSize - Math.floor(columns / 4) * cellSize
    const topBorder = - Math.floor(stateRef.current.positionY / (stateRef.current.scale * cellSize)) * cellSize - Math.floor(rows / 4) * cellSize
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

  const handleClickOnMap = (e: MouseEvent | TouchEvent) => {
    if ('buttons' in e && e.buttons !== 0) return
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const contRect = zoomRef.current!.instance.wrapperComponent!.getBoundingClientRect()
    const x = adapter.playerPosition.x - (stateRef.current.positionX / stateRef.current.scale - (1 - stateRef.current.scale) * rect.width / 2)
    const z = adapter.playerPosition.z - (stateRef.current.positionY / stateRef.current.scale - (1 - stateRef.current.scale) * rect.height / 2)
    const mouseX = ((e as MouseEvent).clientX - contRect.left - contRect.width / 2) * (e.target as HTMLCanvasElement).width / rect.width
    const mouseZ = ((e as MouseEvent).clientY - contRect.top - contRect.height / 2) * (e.target as HTMLCanvasElement).height / rect.height
    drawer?.setWarpPosOnClick(new Vec3(mouseX, 0, mouseZ), new Vec3(x, adapter.playerPosition.y, z))
    setIsWarpInfoOpened(true)
  }

  const eventControl = (event: MouseEvent | TouchEvent) => {
    if (event.type === 'mousemove' || event.type === 'touchmove') {
      isDragging.current = true
    }

    if (event.type === 'mouseup' || event.type === 'touchend') {
      if (!isDragging.current) {
        handleClickOnMap(event)
      }
      isDragging.current = false
    }
  }

  const drawNewPartOfMap = () => {
    const newCanvas = document.createElement('canvas')
    newCanvas.width = Math.floor(200 / stateRef.current.scale)
    if (newCanvas.width % 2) newCanvas.width += 1
    newCanvas.height = Math.floor(200 / stateRef.current.scale)
    if (newCanvas.height % 2) newCanvas.height += 1
    newCanvas.style.position = 'absolute'
    newCanvas.style.top = `${-stateRef.current.positionY / stateRef.current.scale}px`
    newCanvas.style.left = `${-stateRef.current.positionX / stateRef.current.scale}px`
    newCanvas.addEventListener('click', handleClickOnMap)
    oldCanvases.current.push(newCanvas)
    canvasRef.current = newCanvas
    if (canvasesCont.current && drawer) {
      canvasesCont.current.appendChild(newCanvas)
      drawer.canvas = newCanvas
      drawer.draw(
        new Vec3(
          adapter.playerPosition.x - (stateRef.current.positionX / stateRef.current.scale - (1 - stateRef.current.scale) * newCanvas.width / 2),
          adapter.playerPosition.y,
          adapter.playerPosition.z - (stateRef.current.positionY / stateRef.current.scale - (1 - stateRef.current.scale) * newCanvas.height / 2),
        ),
        undefined,
        true
      )
    }
  }

  const deleteOldCanvases = () => {
    if (oldCanvases.current.length < 30) return
    for (const [index, canvas] of oldCanvases.current.entries()) {
      if (index >= 20) break
      canvas.removeEventListener('click', handleClickOnMap)
      canvas.remove()
    }
    oldCanvases.current.splice(0, 20)
  }

  useEffect(() => {
    updateGrid()
  }, [])

  useEffect(() => {
    const wrapper= zoomRef.current?.instance.wrapperComponent
    if (!wrapper) return
    wrapper.style.width = `${Math.min(window.innerHeight, window.innerWidth) / 3}px`
    wrapper.style.aspectRatio = '1'


    updateGrid()
  }, [zoomRef.current])

  return <div
    style={{
      position: 'absolute',
      isolation: 'isolate',
      inset: '0px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      border: '2px solid red',
      backgroundColor: 'rgba(0, 0, 0, 0.4)'
    }}
  >
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: '-1'
      }}
      onClick={toggleFullMap}
    ></div>

    <TransformWrapper
      limitToBounds={false}
      ref={zoomRef}
      minScale={0.1}
      doubleClick={{
        disabled: true
      }}
      panning={{
        allowLeftClickPan: false,
        allowRightClickPan: true,
        allowMiddleClickPan: true
      }}
      onTransformed={(ref, state) => {
        stateRef.current = { ...state }
        // if (
        //   Math.abs(state.positionX - box.current.left) > 20 || Math.abs(state.positionY - box.current.top) > 20
        // ) {
        //   drawNewPartOfMap()
        //   box.current.top = state.positionY
        //   box.current.left = state.positionX
        // }
      }}
      onPanningStop={() => {
        updateGrid()
      }}
      onZoomStop={() => {
        console.log(stateRef.current)
      }}
    >
      <TransformComponent
        wrapperStyle={{
          border: '1px solid black',
          willChange: 'transform',
        }}
      >
        {[...grid].map((cellCoords) => {
          const [x, y] = cellCoords.split(',').map(Number)
          const playerChunkLeft = Math.floor(adapter.playerPosition.x / 16) * 16
          const playerChunkTop = Math.floor(adapter.playerPosition.z / 16) * 16
          console.log('chunkX:', playerChunkLeft + x / 2, 'chunkY:', playerChunkTop + y / 2)

          return <MapCell
            key={cellCoords}
            x={x}
            y={y}
            adapter={adapter}
            worldX={playerChunkLeft + x / 2}
            worldZ={playerChunkTop + y / 2}
          />
        })}
      </TransformComponent>
    </TransformWrapper>
    {
      isWarpInfoOpened && <WarpInfo
        adapter={adapter}
        drawer={drawer}
        setIsWarpInfoOpened={setIsWarpInfoOpened}
        afterWarpIsSet={() => {
          drawNewPartOfMap()
        }}
      />
    }
  </div>
}


const MapCell = (
  { x, y, adapter, worldX, worldZ }
  : 
  { 
    x: number, 
    y: number,
    adapter: DrawerAdapter,
    worldX: number,
    worldZ: number
  }
) => {
  const containerRef = useRef(null)
  const drawerRef = useRef<MinimapDrawer | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isCanvas, setIsCanvas] = useState(false)

  useEffect(() => {
    if (canvasRef.current && isCanvas && !drawerRef.current) {
      drawerRef.current = new MinimapDrawer(canvasRef.current, adapter)
      drawerRef.current.draw(new Vec3(worldX + 8, 0, worldZ + 8), undefined, true)
    } else if (canvasRef.current && isCanvas && drawerRef.current) {
      drawerRef.current.canvas = canvasRef.current
    }
  }, [canvasRef.current, isCanvas])

  useEffect(() => {
    if (drawerRef.current) {
      drawerRef.current.draw(new Vec3(worldX + 8, 0, worldZ + 8), undefined, true)
    }
  }, [drawerRef.current])

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
      width: '32px', 
      height: '32px',
      top: `${y}px`,
      left: `${x}px`,
    }}
  > 
    {isCanvas && <canvas
      ref={canvasRef}
      width={16}
      height={16}
      style={{
        width: '100%',
        height: '100%'
      }}
    ></canvas>}
  </div>
}

const WarpInfo = (
  { adapter, drawer, setIsWarpInfoOpened, afterWarpIsSet }
  :
  {
    adapter: DrawerAdapter,
    drawer: MinimapDrawer | null,
    setIsWarpInfoOpened: Dispatch<SetStateAction<boolean>>,
    afterWarpIsSet?: () => void
  }
) => {
  const [warp, setWarp] = useState<WorldWarp>({
    name: '',
    x: drawer?.lastWarpPos.x ?? 100,
    y: drawer?.lastWarpPos.y ?? 100,
    z: drawer?.lastWarpPos.z ?? 100,
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
          defaultValue={drawer?.lastWarpPos.x ?? 100}
          onChange={(e) => {
            if (!e.target) return
            setWarp(prev => { return { ...prev, x: Number(e.target.value) } })
          }}
        />
        <div>
          Y:
        </div>
        <Input
          rootStyles={posInputStyle}
          defaultValue={drawer?.lastWarpPos.y ?? 100}
          onChange={(e) => {
            if (!e.target) return
            setWarp(prev => { return { ...prev, y: Number(e.target.value) } })
          }}
        />
        <div>
          Z:
        </div>
        <Input
          rootStyles={posInputStyle}
          defaultValue={drawer?.lastWarpPos.z ?? 100}
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
