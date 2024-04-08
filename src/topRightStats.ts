import Stats from 'stats.js'
import StatsGl from 'stats-gl'
import { isCypress } from './standaloneUtils'

const stats = new Stats()
const stats2 = new Stats()
const hasRamPanel = stats2.dom.children.length === 3
const statsGl = new StatsGl({ minimal: true })
// in my case values are good: gpu: < 0.5, cpu < 0.15

stats2.showPanel(2)

// prod or small screen
const denseMode = process.env.NODE_ENV === 'production' || window.innerHeight < 500
const customPanel = document.createElement('div')
customPanel.style.background = 'rgba(0,0,0,0.5)'

let total = 0
const addStat = (dom, size = 80) => {
  dom.style.position = 'absolute'
  if (denseMode) dom.style.height = '12px'
  dom.style.overflow = 'hidden'
  dom.style.left = ''
  dom.style.top = 0
  dom.style.right = `${total}px`
  dom.style.width = '80px'
  dom.style.zIndex = 1000
  dom.style.opacity = '0.8'
  document.body.appendChild(dom)
  total += size
}
const addStatsGlStat = (canvas) => {
  const container = document.createElement('div')
  canvas.style.position = 'static'
  canvas.style.display = 'block'
  container.appendChild(canvas)
  addStat(container)
}
addStat(stats.dom)
if (hasRamPanel) {
  addStat(stats2.dom)
}

const hideStats = localStorage.hideStats || isCypress()
if (hideStats) {
  stats.dom.style.display = 'none'
  stats2.dom.style.display = 'none'
  statsGl.container.style.display = 'none'
}

export const initWithRenderer = (canvas) => {
  if (hideStats) return
  statsGl.init(canvas)
  // if (statsGl.gpuPanel && process.env.NODE_ENV !== 'production') {
  //   addStatsGlStat(statsGl.gpuPanel.canvas)
  // }
  // addStatsGlStat(statsGl.msPanel.canvas)
  statsGl.container.style.display = 'flex'
  statsGl.container.style.justifyContent = 'flex-end'
  let i = 0
  for (const _child of statsGl.container.children) {
    const child = _child as HTMLElement
    if (i++ === 0) {
      child.style.display = 'none'
    }
    child.style.position = ''
  }

  setInterval(() => {
    let text = ''
    for (const [key, value] of Object.entries(customStatsTracker)) {
      text += `${key}: ${value}ms (${Math.ceil(customStatsTrackerCount[key])})\n`
    }

    customPanel.textContent = text
    customStatsTracker = {}
    customStatsTrackerCount = {}
  }, 1000)
}

export const appendTime = (label: string, start: number) => {
  if (hideStats) return
  const time = performance.now() - start
  customStatsTracker[label] ??= 0
  customStatsTracker[label] += time
  customStatsTrackerCount[label] ??= 0
  customStatsTrackerCount[label]++
}

export const statsStart = () => {
  stats.begin()
  stats2.begin()
  statsGl.begin()
}
export const statsEnd = () => {
  stats.end()
  stats2.end()
  statsGl.end()
}
