/* global XMLHttpRequest */
const THREE = require('three')

const textureCache = {}
function loadTexture (texture, cb, onLoad) {
  if (!textureCache[texture]) {
    textureCache[texture] = new THREE.TextureLoader().load(texture, onLoad)
  } else {
    onLoad?.()
  }
  cb(textureCache[texture])
}

function loadJSON (url, callback) {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.responseType = 'json'
  xhr.onload = function () {
    const status = xhr.status
    if (status === 200) {
      callback(xhr.response)
    } else {
      throw new Error(url + ' not found')
    }
  }
  xhr.send()
}

module.exports = { loadTexture, loadJSON }
