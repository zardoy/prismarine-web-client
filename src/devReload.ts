import { isMobile } from 'prismarine-viewer/viewer/lib/simpleUtils'
import { WorldRendererThree } from 'prismarine-viewer/viewer/lib/worldrendererThree'

if (process.env.NODE_ENV === 'development') {
  // mobile devtools
  if (isMobile()) {
    // can be changed to require('eruda')
    //@ts-expect-error
    void import('https://cdn.skypack.dev/eruda').then(({ default: eruda }) => eruda.init())
  }
}
console.log('JS Loaded in', Date.now() - window.startLoad)
