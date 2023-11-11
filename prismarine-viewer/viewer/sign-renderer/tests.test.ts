import { test, expect } from 'vitest'
import { renderSign } from '.'
import PrismarineChatLoader from 'prismarine-chat'

const PrismarineChat = PrismarineChatLoader({ language: {} } as any)
let ctxTexts = [] as any[]

global.document = {
  createElement () {
    return {
      getContext () {
        return {
          fillText (text, x, y) {
            ctxTexts.push({ text, x, y })
          },
          measureText () { return 0 }
        }
      }
    }
  }
} as any

const render = (entity) => {
  ctxTexts = []
  renderSign(entity, PrismarineChat)
  return ctxTexts.map(({ text, y }) => [y / 80, text])
}

test('sign renderer', () => {
  let blockEntity = {
    "GlowingText": 0,
    "Color": "black",
    "Text4": "{\"text\":\"\"}",
    "Text3": "{\"text\":\"\"}",
    "Text2": "{\"text\":\"\"}",
    "Text1": "{\"extra\":[{\"color\":\"dark_green\",\"text\":\"Minecraft \"},{\"text\":\"Tools\"}],\"text\":\"\"}"
  } as any
  expect(render(blockEntity)).toMatchInlineSnapshot(`
    [
      [
        1,
        "",
      ],
      [
        1,
        "Minecraft ",
      ],
      [
        1,
        "Tools",
      ],
      [
        2,
        "",
      ],
      [
        3,
        "",
      ],
      [
        4,
        "",
      ],
    ]
  `)

  blockEntity = { // pre flatenning
    "Text1": "Welcome to",
    "Text2": "",
    "Text3": "null",
    "Text4": "\"Version 2.1\"",
  } as const
  expect(render(blockEntity)).toMatchInlineSnapshot(`
    [
      [
        1,
        "Welcome to",
      ],
      [
        4,
        "Version 2.1",
      ],
    ]
  `)
})
