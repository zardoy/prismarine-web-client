import { useMemo, useEffect, useState } from 'react'
import { showModal } from '../globalState'
import { MessageFormatPart } from '../botUtils'
import { useIsModalActive } from './utils'
import SignEditor from './SignEditor'


const isWysiwyg = async () => {
  const items = await bot.tabComplete('/', true, true)
  const commands = new Set<string>(['data'])
  for (const item of items) {
    if (commands.has(item.match as unknown as string)) {
      return true
    }
  }
  return false
}

export default () => {
  const [location, setLocation] = useState<{x: number, y: number, z: number} | null>(null)
  const [text, setText] = useState<string | string[] | MessageFormatPart[]>('')
  const [enableWysiwyg, setEnableWysiwyg] = useState(false)
  const isModalActive = useIsModalActive('signs-editor-screen')

  const handleInput = (newText: string | MessageFormatPart[]) => {
    if (typeof newText !== 'string') {
      setText(newText)
      return
    }
    if (newText.length > 22 || newText.includes('\n')) {
      const lines = newText.split('\n')
      const result: string[] = []
      for (const line of lines) {
        let startIndex = 0
        while (startIndex < line.length) {
          if (startIndex + 22 < line.length) {
            result.push(line.slice(startIndex, startIndex + 22))
          } else {
            result.push(line.slice(startIndex))
          }
          startIndex += 22
        }
      }
      setText(result)
    } else {
      setText(newText)
    }
  }

  useEffect(() => {
    if (!isModalActive) {
      if (location) {
        if (typeof text === 'string') {
          bot._client.write('update_sign', {
            location,
            text1: text, 
            text2: '',
            text3: '',
            text4: ''
          })
        } else if (text.length === 0) {
          console.error('text array is empty. It should never happen')
        } else if (typeof text[0] === 'string') {
          bot._client.write('update_sign', {
            location,
            text1: text[0], 
            text2: text[1] ?? '',
            text3: text[2] ?? '',
            text4: text[3] ?? ''
          })
        } else if (typeof text[0] === 'object') {
          bot._client.write('update_sign', {
            location,
            text1: JSON.stringify(text[0]), 
            text2: text[1] ? JSON.stringify(text[1]) : '',
            text3: text[2] ? JSON.stringify(text[2]) : '',
            text4: text[3] ? JSON.stringify(text[3]) : ''
          })
        }
      }
    }
  }, [isModalActive])

  useMemo(() => {
    bot._client.on('open_sign_entity', (packet) => {
      setLocation(prev => packet.location)
      showModal({ reactType: 'signs-editor-screen' })
    })
    isWysiwyg().then((value) => {
      setEnableWysiwyg(value)
    })
  }, [])

  if (!isModalActive) return null
  return <SignEditor isWysiwyg={enableWysiwyg} handleInput={handleInput} />
}
