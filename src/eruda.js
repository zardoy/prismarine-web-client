import { isMobile } from './menus/components/common'

if (process.env.NODE_ENV === 'development' && isMobile()) {
  // can be changed to require('eruda')
  import('https://cdn.skypack.dev/eruda').default.init()
  console.log('JS Loaded in', Date.now() - window.startLoad)
}
