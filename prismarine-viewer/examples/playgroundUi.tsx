import { renderToDom } from '@zardoy/react-util'
import { useEffect } from 'react'
import { proxy, useSnapshot } from 'valtio'

export const playgroundGlobalUiState = proxy({
  scenes: [] as string[],
  selected: ''
})

renderToDom(<Playground />)

function Playground () {
  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = /* css */ `
      .lil-gui {
        top: 40px !important;
        right: 0 !important;
      }
    `
    document.body.appendChild(style)
    return () => {
      style.remove()
    }
  }, [])

  return <div style={{
    fontFamily: 'monospace',
    color: 'white',
  }}>
    <SceneSelector />
  </div>
}

function SceneSelector () {
  const { scenes, selected } = useSnapshot(playgroundGlobalUiState)

  return <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
  }}>
    {scenes.map(scene => <div
      key={scene}
      style={{
        padding: '2px 5px',
        cursor: 'pointer',
        userSelect: 'none',
        background: scene === selected ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.6)',
      }}
      onClick={() => {
        const qs = new URLSearchParams(window.location.search)
        qs.set('scene', scene)
        location.search = qs.toString()
      }}
    >{scene}</div>)}
  </div>
}
