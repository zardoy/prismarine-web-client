function safeRequire(path) {
  try {
    return require(path)
  } catch (e) {
    return {}
  }
}
const { loadImage } = safeRequire('node-canvas-webgl/lib')
const path = require('path')
const THREE = require('three')

const textureCache = {}
// todo not ideal, export different functions for browser and node
export function loadTexture(texture, cb) {
  if (process.platform === 'browser') {
    return require('./utils.web').loadTexture(texture, cb)
  }

  if (textureCache[texture]) {
    cb(textureCache[texture])
  } else {
    loadImage(path.resolve(__dirname, '../../public/' + texture)).then(image => {
      textureCache[texture] = new THREE.CanvasTexture(image)
      cb(textureCache[texture])
    })
  }
}

export function loadJSON(json, cb) {
  if (process.platform === 'browser') {
    return require('./utils.web').loadJSON(json, cb)
  }
  cb(require(path.resolve(__dirname, '../../public/' + json)))
}

export const loadScript = async function (/** @type {string} */scriptSrc) {
  if (document.querySelector(`script[src="${scriptSrc}"]`)) {
    return
  }

  return new Promise((resolve, reject) => {
    const scriptElement = document.createElement('script')
    scriptElement.src = scriptSrc
    scriptElement.async = true

    scriptElement.addEventListener('load', () => {
      resolve(scriptElement)
    })

    scriptElement.onerror = (error) => {
      reject(new Error(error.message))
      scriptElement.remove()
    }

    document.head.appendChild(scriptElement)
  })
}
