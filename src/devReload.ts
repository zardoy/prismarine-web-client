import { isMobile } from 'prismarine-viewer/viewer/lib/simpleUtils'
import { WorldRendererThree } from 'prismarine-viewer/viewer/lib/worldrendererThree'

if (process.env.NODE_ENV === 'development') {
  if (sessionStorage.lastReload) {
    const [rebuild, reloadStart] = sessionStorage.lastReload.split(',')
    const now = Date.now()
    console.log(`rebuild + reload:`, `${+rebuild} + ${now - reloadStart} = ${((+rebuild + (now - reloadStart)) / 1000).toFixed(1)}s`)
    sessionStorage.lastReload = ''
  }

  const autoRefresh = () => {
    window.noAutoReload ??= false
    new EventSource('/esbuild').onmessage = async ({ data: _data }) => {
      if (!_data) return
      const data = JSON.parse(_data)
      if (data.update) {
        console.log('[esbuild] Page is outdated')
        document.title = `[O] ${document.title}`
        if (window.noAutoReload || localStorage.noAutoReload) return
        if (localStorage.autoReloadVisible && document.visibilityState !== 'visible') return
        sessionStorage.lastReload = `${data.update.time},${Date.now()}`
        location.reload()
      }
      if (data.replace) {
        console.log('[esbuild hmr] Reloading', data.replace.type, data.replace.path)
        switch (data.replace.type) {
          case 'mesher': {
            if (!worldView || !viewer.world.version || !(viewer.world instanceof WorldRendererThree)) return
            void viewer.world.doHmr()
          }
        }
      }
    }
  }
  autoRefresh()

  // mobile devtools
  if (isMobile()) {
    // can be changed to require('eruda')
    //@ts-expect-error
    void import('https://cdn.skypack.dev/eruda').then(({ default: eruda }) => eruda.init())
    console.log('JS Loaded in', Date.now() - window.startLoad)
  }
}
