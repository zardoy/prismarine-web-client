import { fromFormattedString, render, RenderNode, TextComponent } from '@xmcl/text-component'
import type { ChatMessage } from 'prismarine-chat'

type SignBlockEntity = {
  Color?: string
  GlowingText?: 0 | 1
  Text1?: string
  Text2?: string
  Text3?: string
  Text4?: string
} | {
  // todo
  is_waxed?: 0 | 1
  front_text: {
    color: string
    messages: string[]
    // todo
    has_glowing_text?: 0 | 1
  }
  // todo
  // back_text: {}
}

type JsonEncodedType = string | null | Record<string, any>

const parseSafe = (text: string, task: string) => {
  try {
    return JSON.parse(text)
  } catch (e) {
    console.warn(`Failed to parse ${task}`, e)
    return null
  }
}

export const renderSign = (blockEntity: SignBlockEntity, PrismarineChat: typeof ChatMessage, ctxHook = (ctx) => { }) => {
  // todo don't use texture rendering, investigate the font rendering when possible
  // or increase factor when needed
  const factor = 40
  const signboardY = [16, 9]
  const heightOffset = signboardY[0] - signboardY[1]
  const heightScalar = heightOffset / 16

  let canvas: HTMLCanvasElement | undefined
  let _ctx: CanvasRenderingContext2D | null = null
  const getCtx = () => {
    if (_ctx) return _ctx
    canvas = document.createElement('canvas')

    canvas.width = 16 * factor
    canvas.height = heightOffset * factor

    _ctx = canvas.getContext('2d')!
    _ctx.imageSmoothingEnabled = false

    ctxHook(_ctx)
    return _ctx
  }

  const texts = 'front_text' in blockEntity ? /* > 1.20 */ blockEntity.front_text.messages : [
    blockEntity.Text1,
    blockEntity.Text2,
    blockEntity.Text3,
    blockEntity.Text4
  ]
  const defaultColor = ('front_text' in blockEntity ? blockEntity.front_text.color : blockEntity.Color) || 'black'
  for (const [lineNum, text] of texts.slice(0, 4).entries()) {
    // todo: in pre flatenning it seems the format was not json
    if (text === 'null') continue
    const parsed = text?.startsWith('{') || text?.startsWith('"') ? parseSafe(text ?? '""', 'sign text') : text
    if (!parsed || (typeof parsed !== 'object' && typeof parsed !== 'string')) continue
    // todo fix type
    const message = typeof parsed === 'string' ? fromFormattedString(parsed) : new PrismarineChat(parsed) as never
    const patchExtra = ({ extra }: TextComponent) => {
      if (!extra) return
      for (const child of extra) {
        if (child.color) {
          child.color = child.color === 'dark_green' ? child.color.toUpperCase() : child.color.toLowerCase()
        }
        patchExtra(child)
      }
    }
    patchExtra(message)
    const rendered = render(message)

    const toRenderCanvas: Array<{
      fontStyle: string
      fillStyle: string
      underlineStyle: boolean
      strikeStyle: boolean
      text: string
    }> = []
    let plainText = ''
    // todo the text should be clipped based on it's render width (needs investigate)
    const MAX_LENGTH = 50 // avoid abusing the signboard
    const renderText = (node: RenderNode) => {
      const { component } = node
      let { text } = component
      if (plainText.length + text.length > MAX_LENGTH) {
        text = text.slice(0, MAX_LENGTH - plainText.length)
        if (!text) return false
      }
      plainText += text
      toRenderCanvas.push({
        fontStyle: `${component.bold ? 'bold' : ''} ${component.italic ? 'italic' : ''}`,
        fillStyle: node.style['color'] || defaultColor,
        underlineStyle: component.underlined ?? false,
        strikeStyle: component.strikethrough ?? false,
        text
      })
      for (const child of node.children) {
        const stop = renderText(child) === false
        if (stop) return false
      }
    }

    renderText(rendered)

    // skip rendering empty lines (and possible signs)
    if (!plainText.trim()) continue

    const ctx = getCtx()
    const fontSize = 1.6 * factor
    ctx.font = `${fontSize}px mojangles`
    const textWidth = ctx.measureText(plainText).width

    let renderedWidth = 0
    for (const { fillStyle, fontStyle, strikeStyle, text, underlineStyle } of toRenderCanvas) {
      // todo strikeStyle, underlineStyle
      ctx.fillStyle = fillStyle
      ctx.font = `${fontStyle} ${fontSize}px mojangles`
      ctx.fillText(text, (canvas!.width - textWidth) / 2 + renderedWidth, fontSize * (lineNum + 1))
      renderedWidth += ctx.measureText(text).width // todo isn't the font is monospace?
    }
  }
  // ctx.fillStyle = 'red'
  // ctx.fillRect(0, 0, canvas.width, canvas.height)

  return canvas
}
