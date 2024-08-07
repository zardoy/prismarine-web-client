/* global XMLHttpRequest */
const THREE = require('three')

const textureCache = {}
function loadTexture(texture, cb, onLoad) {
  const cached = textureCache[texture]
  if (!cached) {
    textureCache[texture] = new THREE.TextureLoader().load(texture, onLoad)
  }
  cb(textureCache[texture])
  if (cached) onLoad?.()
}

function loadJSON(url, callback) {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.responseType = 'json'
  xhr.onload = function () {
    const { status } = xhr
    if (status === 200) {
      callback(xhr.response)
    } else {
      throw new Error(url + ' not found')
    }
  }
  xhr.send()
}

module.exports = { loadTexture, loadJSON }
