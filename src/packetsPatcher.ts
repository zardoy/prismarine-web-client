// todo it should not be there, most likely it will be more automatically updated in the future
// todo these fixes should be ported to mineflayer

export default () => {
  customEvents.on('mineflayerBotCreated', () => {
    bot._client.on('packet', (data, meta) => {
      if (meta.name === 'map_chunk') {
        if (data.groundUp && data.bitMap === 1 && data.chunkData.every(x => x === 0)) {
          data.chunkData = Buffer.from(Array.from({ length: 12_544 }).fill(0) as any)
        }
      }
    })
  })
}
