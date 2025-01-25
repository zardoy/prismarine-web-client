/* eslint-disable unicorn/prefer-dom-node-text-content */
const rightOffset = 0

const stats = {}

let lastY = 20
export const addNewStat = (id: string, width = 80, x = rightOffset, y = lastY) => {
  const pane = document.createElement('div')
  pane.style.position = 'fixed'
  pane.style.top = `${y}px`
  pane.style.right = `${x}px`
  // gray bg
  pane.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
  pane.style.color = 'white'
  pane.style.padding = '2px'
  pane.style.fontFamily = 'monospace'
  pane.style.fontSize = '12px'
  pane.style.zIndex = '10000'
  pane.style.pointerEvents = 'none'
  document.body.appendChild(pane)
  stats[id] = pane
  if (y === 0) { // otherwise it's a custom position
    // rightOffset += width
    lastY += 20
  }

  return {
    updateText (text: string) {
      if (pane.innerText === text) return
      pane.innerText = text
    },
    setVisibility (visible: boolean) {
      pane.style.display = visible ? 'block' : 'none'
    }
  }
}

export const updateStatText = (id, text) => {
  if (!stats[id]) return
  stats[id].innerText = text
}

if (typeof customEvents !== 'undefined') {
  customEvents.on('gameLoaded', () => {
    const chunksLoaded = addNewStat('chunks-loaded', 80, 0, 0)
    const chunksTotal = addNewStat('chunks-read', 80, 0, 0)
  })
}
