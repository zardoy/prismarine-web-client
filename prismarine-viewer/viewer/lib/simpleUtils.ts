export function getBufferFromStream (stream) {
  return new Promise(
    (resolve, reject) => {
      let buffer = Buffer.from([])
      stream.on('data', buf => {
        buffer = Buffer.concat([buffer, buf])
      })
      stream.on('end', () => resolve(buffer))
      stream.on('error', reject)
    }
  )
}

export function chunkPos (pos: { x: number, z: number }) {
  const x = Math.floor(pos.x / 16)
  const z = Math.floor(pos.z / 16)
  return [x, z]
}
