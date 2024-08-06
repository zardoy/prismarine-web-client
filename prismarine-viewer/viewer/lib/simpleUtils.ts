export async function getBufferFromStream (stream) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.from([])
    stream.on('data', buf => {
      buffer = Buffer.concat([buffer, buf])
    })
    stream.on('end', () => resolve(buffer))
    stream.on('error', reject)
  })
}

export function openURL (url, newTab = true) {
  if (newTab) {
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    window.open(url, '_self')
  }
}

export const isMobile = () => {
  return window.matchMedia('(pointer: coarse)').matches || navigator.userAgent.includes('Mobile')
}

export function chunkPos (pos: { x: number, z: number }) {
  const x = Math.floor(pos.x / 16)
  const z = Math.floor(pos.z / 16)
  return [x, z]
}

export function sectionPos (pos: { x: number, y: number, z: number }) {
  const x = Math.floor(pos.x / 16)
  const y = Math.floor(pos.y / 16)
  const z = Math.floor(pos.z / 16)
  return [x, y, z]
}
