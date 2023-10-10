import { MessageFormatPart } from '../botUtils'

const MessagePart = ({ part }: { part: MessageFormatPart }) => {
  const { color, italic, bold, underlined, strikethrough, text } = part

  const applyStyles = [
    color ? colorF(color.toLowerCase()) + `; text-shadow: 1px 1px 0px ${getColorShadow(colorF(color.toLowerCase()).replace('color:', ''))}` : messageFormatStylesMap.white,
    italic && messageFormatStylesMap.italic,
    bold && messageFormatStylesMap.bold,
    italic && messageFormatStylesMap.italic,
    underlined && messageFormatStylesMap.underlined,
    strikethrough && messageFormatStylesMap.strikethrough
  ].filter(Boolean)

  return <span style={parseInlineStyle(applyStyles.join(' '))}>{text}</span>
}

export default ({ parts }: { parts: readonly MessageFormatPart[] }) => {
  return (
    <span>
      {parts.map((part, i) => <MessagePart key={i} part={part} />)}
    </span>
  )
}

const colorF = (color) => {
  return color.trim().startsWith('#') ? `color:${color}` : messageFormatStylesMap[color] ?? undefined
}

export function getColorShadow (hex, dim = 0.25) {
  const color = parseInt(hex.replace('#', ''), 16)

  const r = Math.trunc((color >> 16 & 0xFF) * dim)
  const g = Math.trunc((color >> 8 & 0xFF) * dim)
  const b = Math.trunc((color & 0xFF) * dim)

  const f = (c) => ('00' + c.toString(16)).slice(-2)
  return `#${f(r)}${f(g)}${f(b)}`
}

function parseInlineStyle (style: string): Record<string, any> {
  const template = document.createElement('template')
  template.setAttribute('style', style)
  return Object.fromEntries(Object.entries(template.style)
    .filter(([key]) => !/^\d+$/.test(key))
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => [key, value]))
}

export const messageFormatStylesMap = {
  black: 'color:#000000',
  dark_blue: 'color:#0000AA',
  dark_green: 'color:#00AA00',
  dark_aqua: 'color:#00AAAA',
  dark_red: 'color:#AA0000',
  dark_purple: 'color:#AA00AA',
  gold: 'color:#FFAA00',
  gray: 'color:#AAAAAA',
  dark_gray: 'color:#555555',
  blue: 'color:#5555FF',
  green: 'color:#55FF55',
  aqua: 'color:#55FFFF',
  red: 'color:#FF5555',
  light_purple: 'color:#FF55FF',
  yellow: 'color:#FFFF55',
  white: 'color:#FFFFFF',
  bold: 'font-weight:900',
  strikethrough: 'text-decoration:line-through',
  underlined: 'text-decoration:underline',
  italic: 'font-style:italic'
}
