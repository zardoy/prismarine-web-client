import { Vec3 } from 'vec3'
import { useRef, useEffect, useState, CSSProperties, Dispatch, SetStateAction } from 'react'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { MinimapDrawer, DrawerAdapter } from './MinimapDrawer'
import Button from './Button'
import Input from './Input'


type FullmapProps = {
  onClick: () => void, 
  adapter: any, 
  drawer: MinimapDrawer | null,
  canvasRef: any
}

export default ({ onClick, adapter, drawer, canvasRef }: FullmapProps) => {
  const zoomRef = useRef(null)
  const isDragging = useRef(false)
  const [isWarpInfoOpened, setIsWarpInfoOpened] = useState(false)

  const handleClickOnMap = (e: MouseEvent | TouchEvent) => {
    drawer?.setWarpPosOnClick(e, adapter.playerPosition)
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

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.addEventListener('mousemove', eventControl)
      canvasRef.current.addEventListener('touchmove', eventControl)
      canvasRef.current.addEventListener('mouseup', eventControl)
      canvasRef.current.addEventListener('touchend', eventControl)
    } 

    return () => {
      canvasRef.current?.removeEventListener('mousemove', eventControl)
      canvasRef.current?.removeEventListener('touchmove', eventControl)
      canvasRef.current?.removeEventListener('mouseup', eventControl)
      canvasRef.current?.removeEventListener('touchend', eventControl)
      setIsWarpInfoOpened(false)
    }
  }, [])

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
      onClick={onClick}
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
    {isWarpInfoOpened && <WarpInfo adapter={adapter} drawer={drawer} setIsWarpInfoOpened={setIsWarpInfoOpened} />}
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
