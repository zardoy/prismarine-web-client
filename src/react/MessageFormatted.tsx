import { ComponentProps } from 'react'
import { render } from '@xmcl/text-component'
import { noCase } from 'change-case'
import mojangson from 'mojangson'
import { openURL } from 'prismarine-viewer/viewer/lib/simpleUtils'
import { MessageFormatPart } from '../chatUtils'
import { chatInputValueGlobal } from './Chat'
import './MessageFormatted.css'

const hoverItemToText = (hoverEvent: MessageFormatPart['hoverEvent']) => {
  try {
    if (!hoverEvent) return undefined
    const contents = hoverEvent['contents'] ?? hoverEvent.value
    if (typeof contents.text === 'string' && contents.text.startsWith('{')) {
      Object.assign(contents, mojangson.simplify(mojangson.parse(contents.text)))
    }
    if (typeof contents === 'string') return contents
    // if (hoverEvent.action === 'show_text') {
    //   return contents
    // }
    if (hoverEvent.action === 'show_item') {
      return contents.id
    }
    if (hoverEvent.action === 'show_entity') {
      let str = noCase(contents.type.replace('minecraft:', ''))
      if (contents.name) str += `: ${contents.name.text}`
      return str
    }
  } catch (err) {
    // todo report critical error
    reportError?.('Failed to parse message hover' + err.message)
    return undefined
  }
}

const clickEventToProps = (clickEvent: MessageFormatPart['clickEvent']) => {
  if (!clickEvent) return
  if (clickEvent.action === 'run_command' || clickEvent.action === 'suggest_command') {
    return {
      onClick () {
        chatInputValueGlobal.value = clickEvent.value
      }
    }
  }
  if (clickEvent.action === 'open_url') {
    return {
      onClick () {
        const confirm = window.confirm(`Open ${clickEvent.value}?`)
        if (confirm) {
          openURL(clickEvent.value)
        }
      }
    }
  }
  //@ts-expect-error todo
  if (clickEvent.action === 'copy_to_clipboard') {
    return {
      onClick () {
        void navigator.clipboard.writeText(clickEvent.value)
      }
    }
  }
}

export const MessagePart = ({ part, ...props }: { part: MessageFormatPart } & ComponentProps<'span'>) => {

  const { color, italic, bold, underlined, strikethrough, text, clickEvent, hoverEvent, obfuscated } = part

  const clickProps = clickEventToProps(clickEvent)
  const hoverMessageRaw = hoverItemToText(hoverEvent)
  const hoverItemText = hoverMessageRaw && typeof hoverMessageRaw !== 'string' ? render(hoverMessageRaw).children.map(child => child.component.text).join('') : hoverMessageRaw

  const applyStyles = [
    color ? colorF(color.toLowerCase()) + `; text-shadow: 1px 1px 0px ${getColorShadow(colorF(color.toLowerCase()).replace('color:', ''))}` : messageFormatStylesMap.white,
    italic && messageFormatStylesMap.italic,
    bold && messageFormatStylesMap.bold,
    italic && messageFormatStylesMap.italic,
    underlined && messageFormatStylesMap.underlined,
    strikethrough && messageFormatStylesMap.strikethrough,
    obfuscated && messageFormatStylesMap.obfuscated
  ].filter(a => a !== false && a !== undefined).filter(Boolean)

  return <span title={hoverItemText} style={parseInlineStyle(applyStyles.join(' '))} {...clickProps} {...props}>{text}</span>
}

export default ({ parts, className }: { parts: readonly MessageFormatPart[], className?: string }) => {
  return (
    <span className={`formatted-message ${className ?? ''}`}>
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

export function parseInlineStyle (style: string): Record<string, any> {
  const obj: Record<string, any> = {}
  for (const rule of style.split(';')) {
    const [prop, value] = rule.split(':')
    const cssInJsProp = prop.trim().replaceAll(/-./g, (x) => x.toUpperCase()[1])
    obj[cssInJsProp] = value.trim()
  }
  return obj
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
  italic: 'font-style:italic',
  obfuscated: 'filter:blur(2px)',
}
