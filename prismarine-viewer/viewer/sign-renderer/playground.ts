import PrismarineChatLoader from 'prismarine-chat'
import { renderSign } from '.'

const PrismarineChat = PrismarineChatLoader({ language: {} } as any)

const img = new Image()
img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAABbElEQVR4AY3BQY6cMBBA0Q+yQZZVi+ndcJVcKGfMgegdvShKVtuokzGSWwwiUd7rfv388Vst0UgMXCobmgsSA5VaQmKgUks0EgNHji8SA9W8GJCQwVNpLhzJ4KFs4B1HEgPVvBiQkMFTaS44tYTEQDXdIkfiHbuyobmguaDPFzIWGrWExEA13SJH4h1uzS/WbPyvroM1v6jWbFRrNv7GfX5EdmXjzTvUEjJ4zjQXjiQGdmXjzTvUEjJ4HF/UEt/kQqW5UEkMzIshY08jg6dRS3yTC5XmgpsXY7pFztQSEgPNJCNv3lGpJVSfTLfImVpCYsB1HdwfxpU1G9eeNF0H94dxZc2G+/yI7MoG3vEv82LI2NNIDLyVDbzjzFE2mnkxZOy5IoNnkpFGc2FXNpp5MWTsOXJ4h1qikrGnkhjYlY1m1icy9lQSA+TCzjvUEpWMPZXEwK5suPvDOFuzcdZ1sOYX1ZqNas3GlTUbzR+jQbEAcs8ZQAAAAABJRU5ErkJggg=='

await new Promise<void>(resolve => {
  img.onload = () => resolve()
})

const blockEntity = {
  'GlowingText': 0,
  'Color': 'black',
  'Text4': '{"text":""}',
  'Text3': '{"text":""}',
  'Text2': '{"text":""}',
  'Text1': '{"extra":[{"color":"dark_green","text":"Minecraft "},{"text":"Tools"}],"text":""}'
} as const

await document.fonts.load('1em mojangles')

const canvas = renderSign(blockEntity, PrismarineChat, (ctx) => {
  ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height)
})

if (canvas) {
  canvas.style.imageRendering = 'pixelated'
  document.body.appendChild(canvas)
} else {
  console.log('Render skipped')
}
