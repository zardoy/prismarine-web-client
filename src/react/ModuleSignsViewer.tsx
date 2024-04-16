import { useEffect, useRef } from 'react'
import { WorldRendererThree } from 'prismarine-viewer/viewer/lib/worldrendererThree'
import FullScreenWidget from './FullScreenWidget'

export const name = 'signs'

export default () => {
  const signs = viewer.world instanceof WorldRendererThree ? [...viewer.world.chunkTextures.values()].flatMap(textures => {
    return Object.entries(textures).map(([signPosKey, texture]) => {
      const pos = signPosKey.split(',').map(Number)
      return <div key={signPosKey}>
        <div style={{ color: 'white' }}>{pos.join(', ')}</div>
        <div style={{ background: 'rgba(255, 255, 255, 0.5)', padding: 5, borderRadius: 5 }}>
          <AddElem elem={texture.image} />
        </div>
      </div>
    })
  }) : []

  return <FullScreenWidget name='signs' title='Loaded Signs'>
    <div>
      {signs.length} signs currently loaded:
    </div>
    {signs}
  </FullScreenWidget>
}

const AddElem = ({ elem }) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    elem.style.width = '100%'
    ref.current!.appendChild(elem)
    return () => {
      elem.remove()
    }
  }, [])

  return <div ref={ref}></div>
}

// for (const key of Object.keys(viewer.world.sectionObjects)) {
//   const section = viewer.world.sectionObjects[key]
//   for (const child of section.children) {
//     if (child.name === 'mesh') child.visible = false
//   }
// }
