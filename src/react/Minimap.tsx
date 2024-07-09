import { useRef, useEffect, useState, CSSProperties, Dispatch, SetStateAction } from 'react'
import { Vec3 } from 'vec3'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { showModal, hideModal } from '../globalState'
import { useIsModalActive } from './utilsApp'
import { MinimapDrawer, DrawerAdapter } from './MinimapDrawer'
import Input from './Input'
import Button from './Button'


export default ({ adapter, fullMap }: { adapter: DrawerAdapter, fullMap?: boolean }) => {
  const isDragging = useRef(false)
  const zoomRef = useRef(null)
  const fullMapOpened = useIsModalActive('full-map')
  const full = useRef(false)
  const [isWarpInfoOpened, setIsWarpInfoOpened] = useState(false)
  const canvasTick = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawerRef = useRef<MinimapDrawer | null>(null)

  const updateMap = () => {
    if (drawerRef.current) {
      drawerRef.current.draw(adapter.playerPosition, undefined, full.current)
      if (!full.current) {
        rotateMap()
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

  const handleClickOnMap = (e: MouseEvent | TouchEvent) => {
    drawerRef.current?.setWarpPosOnClick(e, adapter.playerPosition)
    setIsWarpInfoOpened(true)
  }

  const updateWarps = () => { }

  const rotateMap = () => {
    if (!drawerRef.current) return
    const angle = adapter.yaw % (Math.PI * 2)
    drawerRef.current.canvas.style.transform = `rotate(${angle}rad)`
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
      canvasRef.current.addEventListener('mousemove', eventControl)
      canvasRef.current.addEventListener('touchmove', eventControl)
      canvasRef.current.addEventListener('mouseup', eventControl)
      canvasRef.current.addEventListener('touchend', eventControl)
    } else if (!fullMapOpened || !fullMap) {
      setIsWarpInfoOpened(false)
    }

    return () => {
      canvasRef.current?.removeEventListener('mousemove', eventControl)
      canvasRef.current?.removeEventListener('touchmove', eventControl)
      canvasRef.current?.removeEventListener('mouseup', eventControl)
      canvasRef.current?.removeEventListener('touchend', eventControl)
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
      onClick={() => {
        toggleFullMap()
      }}
    ></div>

    <TransformWrapper
      limitToBounds={false}
      ref={zoomRef}
      minScale={0.1}    
      doubleClick={{
        disabled: true
      }}
    >
      <TransformComponent
        wrapperStyle={{
          border: '1px solid black',
          willChange: 'transform',
        }}
      >
        <canvas
          width={200}
          height={200}
          ref={canvasRef}
        ></canvas>
      </TransformComponent>
    </TransformWrapper>
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
    onClick={() => {
      toggleFullMap()
    }}
  >
    <canvas width={80} height={80} ref={canvasRef}></canvas>
  </div>
}

const WarpInfo = (
  { adapter, drawer, setIsWarpInfoOpened }
    :
    { adapter: DrawerAdapter, drawer: MinimapDrawer | null, setIsWarpInfoOpened: Dispatch<SetStateAction<boolean>> }
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
